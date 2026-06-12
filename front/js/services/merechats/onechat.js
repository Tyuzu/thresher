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
import { debounce } from "../../utils/deutils.js";
import { MERE_URL, getState } from "../../state/state.js";
import { uploadFile } from "../media/api/mediaApi.js";
import { uid } from "../media/ui/mediaUploadForm.js";
import { t } from "./i18n.js";
import { uploadAttachment } from "./uploadAttachment.js";
// import { getFileType } from "../media/mediaCommon.js";

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


/* -------------------------
   Send message (WS first)
--------------------------*/
export function sendMessage(chatid, content) {
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

  const el = mountMessage(optimistic);
  pendingMap.set(clientId, { el, chatid });

  const ws = ChatState.getSocket();
  const payload = { type: "message", chatid, content, clientId };

  if (ws?.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
      return;
    } catch { }
  }

  sendMessageRESTFallback(chatid, content, clientId);
}

async function sendMessageRESTFallback(chatid, content, clientId) {
  try {
    const msg = await mereFetch(
      `/merechats/chat/${encodeURIComponent(chatid)}/message`,
      "POST",
      JSON.stringify({ content, clientId })
    );

    reconcilePending(chatid, clientId, msg);
  } catch (e) {
    console.error("REST send failed", e);
    pendingMap.delete(clientId);
  }
}

function reconcilePending(chatid, clientId, serverMsg) {
  if (!serverMsg?.messageid) {
    return;
  }

  const rendered = ensureRenderedSet(chatid);
  const realId = String(serverMsg.messageid);

  const pending = pendingMap.get(clientId);
  if (pending?.el) {
    // If the pending entry carries a local preview URL (from upload), inject it
    // into the server message so the newly mounted message shows the local copy.
    if (pending.previewUrl && serverMsg.media) {
      serverMsg.media = serverMsg.media || {};
      // override displayed url with local preview for UX; server url remains in other fields
      serverMsg.media.url = pending.previewUrl;
      serverMsg.media.__local_preview = true;
    }

    pending.el.replaceWith(mountMessage(serverMsg));
  } else if (!rendered.has(realId)) {
    // No pending element: if we have a global map of local previews keyed by media id,
    // we could also inject it here. For now, mount server message as-is.
    mountMessage(serverMsg);
  }

  rendered.add(realId);

  // cleanup: if pending carried a preview URL, keep a short-lived revoke to avoid leaks.
  if (pending?.previewUrl) {
    try {
      const url = pending.previewUrl;
      // revoke after a delay to allow the image element to load from the blob URL.
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch { }
      }, 60 * 1000); // 60s
    } catch { }
  }

  pendingMap.delete(clientId);
}

/* -------------------------
   Load history
--------------------------*/
async function loadHistory(chatid) {
  const container = getMessageContainer();
  if (!container) {
    return;
  }

  container.replaceChildren();
  const rendered = ensureRenderedSet(chatid);

  try {
    const msgs =
      (await safemereFetch(
        `/merechats/chat/${encodeURIComponent(chatid)}/messages`
      )) || [];

    for (const m of msgs) {
      const id = String(m.messageid);
      if (!rendered.has(id)) {
        mountMessage(m);
        rendered.add(id);
      }
    }
  } catch (e) {
    console.error("loadHistory failed", e);
  }
}

/* -------------------------
   Upload attachment
   - show local preview on optimistic message
   - ensure mounted server message uses local preview immediately on success
--------------------------*/


/* -------------------------
   UI
--------------------------*/
export async function displayOneChat(containerx, chatid) {
  closeExistingSocket("chat-switch");

  const container = createElement("div", { class: "onechatcon" });
  containerx.replaceChildren(container);

  const header = createElement("div", { class: "chat-header" }, [
    `${t("chat.with")} ${chatid}`
  ]);

  const messages = createElement("div", {
    class: "chat-messages",
    role: "log",
    "aria-live": "polite"
  });

  const input = createElement("input", {
    type: "text",
    placeholder: t("chat.type_message")
  });

  const fileInput = createElement("input", {
    type: "file",
    style: "display:none"
  });

  const uploadBtn = Button(
    t("chat.upload"),
    "",
    { click: () => fileInput.click() },
    "chat-upload-btn"
  );

  fileInput.addEventListener("change", () =>
    uploadAttachment(chatid, fileInput)
  );

  const sendBtn = Button(
    t("chat.send"),
    "",
    {
      click: () => {
        const txt = input.value.trim();
        if (txt) {
          sendMessage(chatid, txt);
          input.value = "";
        }
      }
    },
    "chat-send-btn"
  );

  input.addEventListener(
    "input",
    debounce(() => {
      const ws = ChatState.getSocket();
      if (ws?.readyState === WebSocket.OPEN && input.value.trim().length > 1) {
        ws.send(JSON.stringify({ type: "typing", chatid }));
      }
    }, 800)
  );

  container.append(
    header,
    messages,
    createElement("div", { class: "chat-footer" }, [
      uploadBtn,
      fileInput,
      input,
      sendBtn
    ])
  );

  ChatState.setChatId(chatid);
  setMessageContainer(messages);

  await loadHistory(chatid);
  connectWebSocket();
}

/* -------------------------
   Manual close
--------------------------*/
export function closeSocket() {
  closeExistingSocket("manual");
}
