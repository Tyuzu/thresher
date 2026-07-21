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
  mountMessage
} from "./chatSocket.js";
import { mereFetch } from "../../api/api.js";
import { throttle } from "../../utils/deutils.js";
import { getState } from "../../state/state.js";
import { t } from "./i18n.js";
import { uploadAttachment } from "./uploadAttachment.js";

/* -------------------------
   Safe fetch
--------------------------*/
export async function safemereFetch(url, method = "GET", body = null, options = {}) {
  try {
    return await mereFetch(url, method, body, options);
  } catch {
    return null;
  }
}

/* -------------------------
   Helpers
--------------------------*/
function ensureRenderedSet(chatid) {
  let set = renderedIdsMap.get(chatid);
  if (!set) {
    set = new Set();
    renderedIdsMap.set(chatid, set);
  }
  return set;
}

function scrollToBottom(container) {
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

/* -------------------------
   Send message (WS first with REST fallback)
--------------------------*/
export function sendMessage(chatid, content, targetContainer = getMessageContainer()) {
  if (!content || !content.trim()) {
    return;
  }

  const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const optimistic = {
    messageid: clientId,
    sender: getState("user"),
    content,
    createdAt: new Date().toISOString()
  };

  const el = mountMessage(optimistic, { container: targetContainer });
  pendingMap.set(clientId, { el, chatid, container: targetContainer });
  
  // Smooth scroll to bottom on new message
  scrollToBottom(targetContainer);

  const ws = ChatState.getSocket();
  const payload = { type: "message", chatid, content, clientId };

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

async function sendMessageRESTFallback(chatid, content, clientId, targetContainer) {
  try {
    const msg = await mereFetch(
      `/merechats/chat/${encodeURIComponent(chatid)}/message`,
      "POST",
      JSON.stringify({ content, clientId })
    );

    reconcilePending(chatid, clientId, msg, targetContainer);
  } catch (e) {
    console.error("REST send failed", e);
    pendingMap.delete(clientId);
  }
}

function reconcilePending(chatid, clientId, serverMsg, targetContainer = getMessageContainer()) {
  if (!serverMsg?.messageid) {
    return;
  }

  const rendered = ensureRenderedSet(chatid);
  const realId = String(serverMsg.messageid);
  const pending = pendingMap.get(clientId);

  if (pending?.el) {
    if (pending.previewUrl && serverMsg.media) {
      serverMsg.media = serverMsg.media || {};
      serverMsg.media.url = pending.previewUrl;
      serverMsg.media.__local_preview = true;
    }

    const freshElement = mountMessage(serverMsg, { container: targetContainer });
    pending.el.replaceWith(freshElement);
  } else if (!rendered.has(realId)) {
    mountMessage(serverMsg, { container: targetContainer });
  }

  rendered.add(realId);

  if (pending?.previewUrl) {
    const url = pending.previewUrl;
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }, 60000);
  }

  pendingMap.delete(clientId);
  scrollToBottom(targetContainer);
}

/* -------------------------
   Load history
--------------------------*/
async function loadHistory(chatid, targetContainer = getMessageContainer()) {
  if (!targetContainer) {
    return;
  }

  const rendered = ensureRenderedSet(chatid);
  targetContainer.replaceChildren();
  targetContainer.dataset.chatid = chatid;

  try {
    const msgs =
      (await safemereFetch(
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

/* -------------------------
   UI Rendering
--------------------------*/
export async function displayOneChat(containerx, chatid) {
  let container = containerx.querySelector(".onechatcon");

  if (!container) {
    container = createElement("div", { class: "onechatcon" });
    containerx.replaceChildren(container);
  }

  // Header with back button slot or title
  const header = createElement("div", { class: "chat-header" }, [
    createElement("span", { class: "chat-title" }, [`${t("chat.with")} ${chatid}`])
  ]);

  let messages = container.querySelector(".chat-messages");

  if (!messages) {
    messages = createElement("div", {
      class: "chat-messages",
      role: "log",
      "aria-live": "polite",
      dataset: { chatid }
    });
  }

  // Inputs configured for mobile keyboard & accessibility
  const input = createElement("input", {
    type: "text",
    placeholder: t("chat.type_message"),
    class: "chat-input",
    autocomplete: "off",
    autocapitalize: "sentences",
    enterkeyhint: "send" // Sets action key on native mobile keyboard to "Send"
  });

  const fileInput = createElement("input", {
    type: "file",
    style: "display:none",
    accept: "image/*,video/*,application/pdf"
  });

  const uploadBtn = Button(
    t("chat.upload"),
    "",
    { click: (e) => { e.preventDefault(); fileInput.click(); } },
    "chat-btn chat-upload-btn"
  );

  fileInput.addEventListener("change", () =>
    uploadAttachment(chatid, fileInput)
  );

  const handleSend = (e) => {
    if (e) e.preventDefault(); // Handles both button taps and form submits
    const txt = input.value.trim();
    if (txt) {
      sendMessage(chatid, txt, messages);
      input.value = "";
      input.focus(); // Retain focus for continuous messaging
    }
  };

  const sendBtn = Button(
    t("chat.send"),
    "",
    { type: "submit" },
    "chat-btn chat-send-btn"
  );

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
        ws.send(JSON.stringify({ type: "typing", chatid }));
      }
    }, 1500)
  );

  if (!container.querySelector(".chat-header")) {
    container.append(header, messages, formFooter);
  }

  ChatState.setChatId(chatid);
  setMessageContainer(messages);

  await loadHistory(chatid, messages);
  connectWebSocket();
}

/* -------------------------
   Manual close
--------------------------*/
export function closeSocket() {
  closeExistingSocket("manual");
}