import { getState, setState, MERE_WS } from "../../state/state.js";
import { renderMessage } from "./components/index.js";
import { playSoundAlert } from "../notifications/soundAlerts.js";

/* -------------------------
   Module state
--------------------------*/
const pendingMap = new Map();
const renderedIdsMap = new Map();
let reconnectTimer = null;
let messageContainer = null;

/* -------------------------
   ChatState (singleton)
--------------------------*/
const ChatState = (() => {
  let socket = null;
  let reconnectAttempts = 0;
  let currentChatId = null;

  return {
    setSocket: ws => {
      socket = ws;
    },
    getSocket: () => socket,
    setReconnectAttempts: n => {
      reconnectAttempts = n;
    },
    getReconnectAttempts: () => reconnectAttempts,
    incrementReconnectAttempts: () => {
      reconnectAttempts += 1;
    },
    resetReconnectAttempts: () => {
      reconnectAttempts = 0;
    },
    setChatId: id => {
      currentChatId = id;
      if (!renderedIdsMap.has(id)) {
        renderedIdsMap.set(id, new Set());
      }
    },
    getChatId: () => currentChatId
  };
})();

/* -------------------------
   Shared message container helpers
--------------------------*/
export function getMessageContainer() {
  return messageContainer;
}

export function setMessageContainer(el) {
  messageContainer = el;
}

/* -------------------------
   Internal helpers
--------------------------*/
function ensureRenderedSet(chatid) {
  let set = renderedIdsMap.get(chatid);
  if (!set) {
    set = new Set();
    renderedIdsMap.set(chatid, set);
  }
  return set;
}

function normalizeId(msg) {
  return String(
    msg?.messageid ||
    msg?.id ||
    crypto.randomUUID()
  );
}

/**
 * Normalizes incoming network structures onto the internal client schema
 */
function normalizeMessagePayload(data) {
  if (!data) return {};
  return {
    ...data,
    messageid: data.messageid || data.id,
    content: data.content || data.text || data.message || ""
  };
}

/**
 * Smoothly scrolls message viewport down, taking un-rendered media heights into account
 */
function scrollToBottom(container) {
  if (!container) return;
  
  // Safe calculation for immediate render heights
  container.scrollTop = container.scrollHeight;

  // FIXED: Detect heavy media assets inside the newly appended element 
  // and trigger a viewport re-scroll after they load.
  const images = container.querySelectorAll("img, video");
  images.forEach(media => {
    if (!media.complete) {
      media.addEventListener("load", () => {
        container.scrollTop = container.scrollHeight;
      }, { once: true });
    }
  });
}

/* -------------------------
   Mount message
--------------------------*/
export function mountMessage(
  msg,
  { pending = false, container = getMessageContainer() } = {}
) {
  const targetContainer =
    container ||
    getMessageContainer() ||
    document.querySelector(".chat-messages");

  if (!targetContainer) {
    return null;
  }

  const normalized = normalizeMessagePayload(msg);
  const id = normalizeId(normalized);
  const domId = `msg-${id}`;

  const existingNode = document.getElementById(domId);
  if (existingNode) {
    return existingNode;
  }

  const node = renderMessage({
    ...normalized,
    pending
  });

  node.id = domId;

  if (pending) {
    node.style.opacity = "0.5";
    node.setAttribute("data-pending", "1");
  }

  targetContainer.appendChild(node);
  scrollToBottom(targetContainer);

  return node;
}

/* -------------------------
   Reconcile optimistic message
--------------------------*/
export function reconcilePending(
  chatid,
  clientId,
  serverMessage
) {
  const pending = pendingMap.get(clientId);
  const rendered = ensureRenderedSet(chatid);
  
  const normalized = normalizeMessagePayload(serverMessage);
  const serverId = String(normalized.messageid);

  if (!pending) {
    if (!rendered.has(serverId)) {
      mountMessage(normalized);
      rendered.add(serverId);
    }
    return;
  }

  const oldEl = pending.el;
  const newEl = renderMessage(normalized);
  newEl.id = `msg-${serverId}`;

  const targetContainer =
    pending.container ||
    getMessageContainer() ||
    document.querySelector(".chat-messages");

  if (oldEl?.parentNode) {
    oldEl.parentNode.replaceChild(newEl, oldEl);
  } else if (targetContainer) {
    targetContainer.appendChild(newEl);
  }

  rendered.add(serverId);
  pendingMap.delete(clientId);

  if (targetContainer) {
    scrollToBottom(targetContainer);
  }
}

/* -------------------------
   WebSocket configuration
--------------------------*/
function wsUrl() {
  const token = getState("token");
  let url = MERE_WS.replace(/^http/, "ws") + "/ws/merechat";
  if (token) {
    url += `?token=${encodeURIComponent(token)}`;
  }
  return url;
}

function joinChatRoom(socket, chatid) {
  if (!socket || !chatid) {
    return;
  }
  if (socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify({ type: "join", chatid }));
    } catch {}
  }
}

export function closeExistingSocket(reason = "") {
  const ws = ChatState.getSocket();

  if (ws) {
    // FIXED: Cleanly unbind closing callbacks before closing manually to prevent infinite reconnect cascades
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.onopen = null;

    try {
      ws.close();
    } catch {}

    ChatState.setSocket(null);
  }

  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  ChatState.resetReconnectAttempts();
}

/* -------------------------
   WebSocket connection manager
--------------------------*/
export function connectWebSocket() {
  const existing = ChatState.getSocket();

  if (
    existing &&
    (
      existing.readyState === WebSocket.OPEN ||
      existing.readyState === WebSocket.CONNECTING
    )
  ) {
    const chatid = ChatState.getChatId();
    if (existing.readyState === WebSocket.OPEN) {
      joinChatRoom(existing, chatid);
    }
    return;
  }

  clearTimeout(reconnectTimer);

  let socket;
  try {
    socket = new WebSocket(wsUrl());
  } catch {
    scheduleReconnect();
    return;
  }

  ChatState.setSocket(socket);

  socket.onopen = () => {
    ChatState.resetReconnectAttempts();

    const token = getState("token");
    if (token) {
      socket.send(
        JSON.stringify({
          type: "presence",
          online: true
        })
      );
    }

    const chatid = ChatState.getChatId();
    joinChatRoom(socket, chatid);
  };

  socket.onmessage = ev => {
    let data;
    try {
      data = JSON.parse(ev.data);
    } catch {
      return;
    }
    handleWSMessage(data);
  };

  socket.onerror = () => {
    socket.close();
  };

  socket.onclose = () => {
    ChatState.setSocket(null);
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  const attempts = ChatState.getReconnectAttempts();
  const delay = Math.min(30000, 1000 * Math.pow(2, attempts));

  ChatState.incrementReconnectAttempts();
  clearTimeout(reconnectTimer);

  reconnectTimer = setTimeout(
    connectWebSocket,
    delay
  );
}

/* -------------------------
   Handle incoming WebSocket packets
--------------------------*/
function handleWSMessage(rawData) {
  if (!rawData?.type) {
    return;
  }

  const data = normalizeMessagePayload(rawData);

  switch (data.type) {
    case "message": {
      const chatid = data.chatid;
      if (!chatid) {
        return;
      }

      playSoundAlert({ type: "message", chatId: chatid });

      // Handle message targeting other non-active feeds
      if (chatid !== ChatState.getChatId()) {
        const unread = getState("unreadMessages") || 0;
        setState("unreadMessages", unread + 1);

        if (
          typeof Notification !== "undefined" &&
          document.visibilityState === "hidden" &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(
              data.senderName || data.username || "New message",
              {
                body: data.content,
                icon: "/favicon.ico"
              }
            );
          } catch {}
        }
        return;
      }

      const serverId = String(data.messageid);
      const rendered = ensureRenderedSet(chatid);

      // Reconcile optimistic/pending elements matching this id
      if (
        data.clientId &&
        pendingMap.has(data.clientId)
      ) {
        reconcilePending(chatid, data.clientId, data);
        rendered.add(serverId);
        return;
      }

      // Prevent duplicating UI nodes
      if (rendered.has(serverId)) {
        return;
      }

      mountMessage(data);
      rendered.add(serverId);
      break;
    }

    case "typing":
      break;

    case "presence":
      break;

    default:
      break;
  }
}

export {
  ChatState,
  pendingMap,
  renderedIdsMap,
  renderMessage
};