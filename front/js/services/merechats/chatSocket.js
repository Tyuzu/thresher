import { getState, setState, MERE_WS } from "../../state/state.js";
import { renderMessage } from "./components/index.js";
import { playSoundAlert } from "../notifications/soundAlerts.js";

/* -------------------------
   Module state
--------------------------*/
const pendingMap = new Map();
const renderedIdsMap = new Map();

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
   Shared message container
--------------------------*/
let messageContainer = null;

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

  const id = normalizeId(msg);
  const domId = `msg-${id}`;

  if (document.getElementById(domId)) {
    return document.getElementById(domId);
  }

  const node = renderMessage({
    ...msg,
    pending
  });

  node.id = domId;

  if (pending) {
    node.style.opacity = "0.5";
    node.setAttribute("data-pending", "1");
  }

  targetContainer.appendChild(node);

  try {
    targetContainer.scrollTop =
      targetContainer.scrollHeight;
  } catch { }

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
  const pending =
    pendingMap.get(clientId);

  const rendered =
    ensureRenderedSet(chatid);

  const serverId = String(
    serverMessage.messageid
  );

  if (!pending) {
    if (!rendered.has(serverId)) {
      mountMessage(serverMessage);
      rendered.add(serverId);
    }

    return;
  }

  const oldEl = pending.el;

  const newEl = renderMessage(serverMessage);

  newEl.id = `msg-${serverId}`;

  if (oldEl?.parentNode) {
    oldEl.parentNode.replaceChild(
      newEl,
      oldEl
    );
  } else {
    const targetContainer =
      pending.container ||
      getMessageContainer() ||
      document.querySelector(
        ".chat-messages"
      );

    if (targetContainer) {
      targetContainer.appendChild(newEl);
    }
  }

  rendered.add(serverId);
  pendingMap.delete(clientId);
}

/* -------------------------
   Exports
--------------------------*/
export {
  ChatState,
  pendingMap,
  renderedIdsMap,
  renderMessage
};

/* -------------------------
   WebSocket utils
--------------------------*/
function wsUrl() {
  const token = getState("token");

  let url =
    MERE_WS.replace(/^http/, "ws") +
    "/ws/merechat";

  if (token) {
    url +=
      `?token=${encodeURIComponent(token)}`;
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
    } catch {
      // ignore join failures and rely on a reconnect if needed
    }
  }
}

export function closeExistingSocket(
  reason = ""
) {
  const ws = ChatState.getSocket();

  if (ws) {
    try {
      ws.close();
    } catch { }

    ChatState.setSocket(null);
  }

  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  ChatState.resetReconnectAttempts();

  if (reason) {
  }
}

/* -------------------------
   WebSocket connection
--------------------------*/
let reconnectTimer = null;

export function connectWebSocket() {
  const existing =
    ChatState.getSocket();

  if (
    existing &&
    (
      existing.readyState ===
      WebSocket.OPEN ||
      existing.readyState ===
      WebSocket.CONNECTING
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

    const token =
      getState("token");

    if (token) {
      socket.send(
        JSON.stringify({
          type: "presence",
          online: true
        })
      );
    }

    const chatid =
      ChatState.getChatId();

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

// socket.on("message", msg => {
//     setState(
//         "unreadMessages",
//         getState("unreadMessages") + 1
//     );

//     showToast({
//         title: msg.senderName,
//         body: msg.text
//     });
// });

function scheduleReconnect() {
  const attempts =
    ChatState.getReconnectAttempts();

  const delay = Math.min(
    30000,
    1000 * Math.pow(2, attempts)
  );

  ChatState.incrementReconnectAttempts();

  clearTimeout(reconnectTimer);

  reconnectTimer = setTimeout(
    connectWebSocket,
    delay
  );
}

/* -------------------------
   Handle WS messages
--------------------------*/
/* -------------------------
   Handle WS messages
--------------------------*/
function handleWSMessage(data) {
  if (!data?.type) {
    return;
  }

  switch (data.type) {
    case "message": {
      const chatid = data.chatid;

      if (!chatid) {
        return;
      }

      playSoundAlert({ type: "message", chatId: chatid });

      // Message belongs to another chat
      if (chatid !== ChatState.getChatId()) {
        const unread = getState("unreadMessages") || 0;

        setState("unreadMessages", unread + 1);

        // Browser notification (if supported and permitted)
        if (
          typeof Notification !== "undefined" &&
          document.visibilityState === "hidden" &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(
              data.senderName ||
              data.username ||
              "New message",
              {
                body:
                  data.text ||
                  data.message ||
                  "",
                icon: "/favicon.ico"
              }
            );
          } catch {}
        }

        return;
      }

      const serverId = String(data.messageid);

      const rendered = ensureRenderedSet(chatid);

      // Replace optimistic message
      if (
        data.clientId &&
        pendingMap.has(data.clientId)
      ) {
        reconcilePending(
          chatid,
          data.clientId,
          data
        );

        rendered.add(serverId);
        return;
      }

      // Prevent duplicate rendering
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