import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import {
  ChatState,
  pendingMap,
  renderedIdsMap,
  connectWebSocket,
  closeExistingSocket,
  getMessageContainer,
  setMessageContainer,
  mountMessage,
  PendingMessage,
  ChatMessage
} from "./chatSocket.js";
import { throttle } from "../../utils/deutils.js";
import { merechatFetch } from "./api.js";
import { getState } from "../../state/state.js";
import { t } from "./i18n.js";
import { uploadAttachment } from "./uploadAttachment.js";

/* ───────────────────────────────────────── */
/* Types & Interfaces                       */
/* ───────────────────────────────────────── */

export interface OutgoingMessagePayload {
  type: "message" | "typing";
  chatid: string | number;
  content?: string;
  clientId?: string;
}

export interface UserState {
  userid: string | number;
  [key: string]: unknown;
}

/* ───────────────────────────────────────── */
/* Safe Fetch                                */
/* ───────────────────────────────────────── */

export async function safemereFetch<T = unknown>(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
  body: string | FormData | null = null,
  options: Record<string, unknown> = {}
): Promise<T | null> {
  try {
    return await merechatFetch<T>(url, method, body, options);
  } catch {
    return null;
  }
}

/* ───────────────────────────────────────── */
/* Helpers                                   */
/* ───────────────────────────────────────── */

function ensureRenderedSet(chatid: string | number): Set<string> {
  const key = String(chatid);
  let set = renderedIdsMap.get(key);
  if (!set) {
    set = new Set<string>();
    renderedIdsMap.set(key, set);
  }
  return set;
}

function scrollToBottom(container: HTMLElement | null): void {
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

/* ───────────────────────────────────────── */
/* Send Message (WS first with REST fallback) */
/* ───────────────────────────────────────── */

export function sendMessage(
  chatid: string | number,
  content: string,
  targetContainer: HTMLElement | null = getMessageContainer()
): void {
  if (!content || !content.trim()) {
    return;
  }

  const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const user = getState("user") as UserState | undefined;

  const optimistic: ChatMessage = {
    messageid: clientId,
    sender: user?.userid ?? "",
    content,
    createdAt: new Date().toISOString()
  };

  const el = mountMessage(optimistic, { container: targetContainer });
  pendingMap.set(clientId, { el, chatid, container: targetContainer } as PendingMessage);

  // Smooth scroll to bottom on new message
  scrollToBottom(targetContainer);

  const ws = ChatState.getSocket();
  const payload: OutgoingMessagePayload = { type: "message", chatid, content, clientId };

  if (ws?.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
      return;
    } catch (err) {
      console.warn("WS send failed, attempting REST fallback...", err);
    }
  }

  sendMessageRESTFallback(chatid, content, clientId, targetContainer);
}

async function sendMessageRESTFallback(
  chatid: string | number,
  content: string,
  clientId: string,
  targetContainer: HTMLElement | null
): Promise<void> {
  try {
    const msg = await merechatFetch<ChatMessage>(
      `/merechats/chat/${encodeURIComponent(String(chatid))}/message`,
      "POST",
      JSON.stringify({ content, clientId })
    );

    reconcilePending(chatid, clientId, msg, targetContainer);
  } catch (e) {
    console.error("REST send failed", e);
    pendingMap.delete(clientId);
  }
}

export function reconcilePending(
  chatid: string | number,
  clientId: string,
  serverMsg: ChatMessage,
  targetContainer: HTMLElement | null = getMessageContainer()
): void {
  if (!serverMsg?.messageid) {
    return;
  }

  const rendered = ensureRenderedSet(chatid);
  const realId = String(serverMsg.messageid);
  const pending = pendingMap.get(clientId) as PendingMessage | undefined;

  const p = pending;
  if (p && p.el instanceof HTMLElement) {
    if (p.previewUrl && serverMsg.media) {
      serverMsg.media = serverMsg.media || {};
      serverMsg.media.url = p.previewUrl;
      serverMsg.media.__local_preview = true;
    }

    const freshElement = mountMessage(serverMsg, { container: targetContainer });
    if (freshElement) {
      (p.el as HTMLElement).replaceWith(freshElement);
    }
  } else if (!rendered.has(realId)) {
    mountMessage(serverMsg, { container: targetContainer });
  }

  rendered.add(realId);

  if (pending?.previewUrl) {
    const url = pending.previewUrl;
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch { }
    }, 60000);
  }

  pendingMap.delete(clientId);
  scrollToBottom(targetContainer);
}

/* ───────────────────────────────────────── */
/* Load History                              */
/* ───────────────────────────────────────── */

async function loadHistory(
  chatid: string | number,
  targetContainer: HTMLElement | null = getMessageContainer()
): Promise<void> {
  if (!targetContainer) {
    return;
  }

  const rendered = ensureRenderedSet(chatid);
  targetContainer.replaceChildren();
  targetContainer.dataset.chatid = String(chatid);

  try {
    const msgs =
      (await safemereFetch<ChatMessage[]>(
        `/merechats/chat/${encodeURIComponent(chatid)}/messages`
      )) || [];

    for (const m of msgs) {
      const id = String(m.messageid);
      if (!rendered.has(id)) {
        mountMessage(m, { container: targetContainer });
        rendered.add(id);
      }
    }

    // Initial scroll after loading conversation history
    scrollToBottom(targetContainer);
  } catch (e) {
    console.error("loadHistory failed", e);
  }
}

/* ───────────────────────────────────────── */
/* UI Rendering                              */
/* ───────────────────────────────────────── */

export async function displayOneChat(
  containerx: HTMLElement,
  chatid: string | number
): Promise<void> {
  let container = containerx.querySelector<HTMLElement>(".onechatcon");

  if (!container) {
    container = createElement("div", { class: "onechatcon" }) as HTMLElement;
    containerx.replaceChildren(container);
  }

  // Header with back button slot or title
  const header = createElement("div", { class: "chat-header" }, [
    createElement("span", { class: "chat-title" }, [`${t("chat.with")} ${chatid}`])
  ]);

  let messages = container.querySelector<HTMLElement>(".chat-messages");

  if (!messages) {
    messages = createElement("div", {
      class: "chat-messages",
      role: "log",
      "aria-live": "polite",
      dataset: { chatid: String(chatid) }
    }) as HTMLElement;
  }

  // Inputs configured for mobile keyboard & accessibility
  const input = createElement("input", {
    type: "text",
    placeholder: t("chat.type_message"),
    class: "chat-input",
    autocomplete: "off",
    autocapitalize: "sentences",
    enterkeyhint: "send" // Sets action key on native mobile keyboard to "Send"
  }) as HTMLInputElement;

  const fileInput = createElement("input", {
    type: "file",
    style: "display:none",
    accept: "image/*,video/*,application/pdf"
  }) as HTMLInputElement;

  const uploadBtn = Button({
    title: t("chat.upload"),
    id: "",
    events: { click: (e: Event) => { e.preventDefault(); fileInput.click(); } },
    classes: "chat-btn chat-upload-btn"
  });

  fileInput.addEventListener("change", () =>
    uploadAttachment(String(chatid), fileInput)
  );

  const handleSend = (e?: Event): void => {
    if (e) e.preventDefault(); // Handles both button taps and form submits
    const txt = input.value.trim();
    if (txt) {
      sendMessage(chatid, txt, messages);
      input.value = "";
      input.focus(); // Retain focus for continuous messaging
    }
  };

  const sendBtn = Button({
    title: t("chat.send"),
    id: "",
    classes: "chat-btn chat-send-btn"
  });
  sendBtn.type = "submit";

  // Wrapped footer in a <form> to natively support mobile "Send" / "Go" actions
  const formFooter = createElement(
    "form",
    {
      class: "chat-footer",
      events: { submit: handleSend }
    },
    [uploadBtn, fileInput, input, sendBtn]
  );

  // Send typing notification
  input.addEventListener(
    "input",
    throttle(() => {
      const ws = ChatState.getSocket();
      if (ws?.readyState === WebSocket.OPEN && input.value.trim().length > 0) {
        const payload: OutgoingMessagePayload = { type: "typing", chatid };
        ws.send(JSON.stringify(payload));
      }
    }, 1500)
  );

  if (!container.querySelector(".chat-header")) {
    container.append(header, messages, formFooter);
  }

  ChatState.setChatId(String(chatid));
  setMessageContainer(messages);

  await loadHistory(chatid, messages);
  connectWebSocket();
}

/* ───────────────────────────────────────── */
/* Manual Close                              */
/* ───────────────────────────────────────── */

export function closeSocket(): void {
  closeExistingSocket("manual");
}