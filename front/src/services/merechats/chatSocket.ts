import {
  getState,
  setState,
  MERE_WS
} from "../../state/state.js";
import {
  renderMessage
} from "./components/index.js";
import {
  playSoundAlert
} from "../notifications/soundAlerts.js";

/* ───────────────────────────────────────── */
/* Types & Interfaces                       */
/* ───────────────────────────────────────── */

export interface MediaPayload {
  mediaId?: string;
  url?: string;
  mimeType?: string;
  type?: "video" | "image" | string;
  serverUrl?: string;
  previewUrl?: string;
  __local_preview?: boolean;
  [key: string]: unknown;
}

export interface ChatMessage {
  messageid?: string | number;
  id?: string | number;
  sender?: string | number;
  senderName?: string;
  username?: string;
  createdAt?: string;
  content?: string;
  text?: string;
  message?: string;
  chatid?: string | number;
  clientId?: string;
  media?: MediaPayload;
  pending?: boolean;
  type?: string;
  [key: string]: unknown;
}

export interface PendingMessage {
  el: HTMLElement | null;
  chatid: string | number;
  container?: HTMLElement | null;
  previewUrl?: string;
  progress?: number;
}

export interface WSPacket {
  type: "message" | "typing" | "presence" | "join" | string;
  chatid?: string | number;
  clientId?: string;
  online?: boolean;
  senderName?: string;
  username?: string;
  content?: string;
  messageid?: string | number;
  id?: string | number;
  [key: string]: unknown;
}

export interface MountMessageOptions {
  pending?: boolean;
  container?: HTMLElement | null;
}

/* ───────────────────────────────────────── */
/* Module State                             */
/* ───────────────────────────────────────── */

export const pendingMap = new Map<string, PendingMessage>();
export const renderedIdsMap = new Map<string, Set<string>>();

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let messageContainer: HTMLElement | null = null;

/* ───────────────────────────────────────── */
/* ChatState Singleton                      */
/* ───────────────────────────────────────── */

export const ChatState = (() => {
  let socket: WebSocket | null = null;
  let reconnectAttempts = 0;
  let currentChatId: string | null = null;

  return {
    setSocket: (ws: WebSocket | null): void => {
      socket = ws;
    },
    getSocket: (): WebSocket | null => socket,
    setReconnectAttempts: (n: number): void => {
      reconnectAttempts = n;
    },
    getReconnectAttempts: (): number => reconnectAttempts,
    incrementReconnectAttempts: (): void => {
      reconnectAttempts += 1;
    },
    resetReconnectAttempts: (): void => {
      reconnectAttempts = 0;
    },
    setChatId: (id: string | number): void => {
      const strId = String(id);
      currentChatId = strId;
      if (!renderedIdsMap.has(strId)) {
        renderedIdsMap.set(strId, new Set<string>());
      }
    },
    getChatId: (): string | null => currentChatId
  };
})();

/* ───────────────────────────────────────── */
/* Shared Message Container Helpers         */
/* ───────────────────────────────────────── */

export function getMessageContainer(): HTMLElement | null {
  return messageContainer;
}

export function setMessageContainer(el: HTMLElement | null): void {
  messageContainer = el;
}

/* ───────────────────────────────────────── */
/* Internal Helpers                         */
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

function normalizeId(msg: ChatMessage): string {
  return String(msg?.messageid || msg?.id || crypto.randomUUID());
}

/**
 * Normalizes incoming network structures onto the internal client schema
 */
function normalizeMessagePayload(data: ChatMessage | WSPacket): ChatMessage {
  if (!data) return {};
  return {
    ...data,
    messageid: data.messageid || data.id,
    content: data.content || (data as ChatMessage).text || (data as ChatMessage).message || ""
  };
}

/**
 * Smoothly scrolls message viewport down, taking un-rendered media heights into account
 */
function scrollToBottom(container: HTMLElement | null): void {
  if (!container) return;

  // Safe calculation for immediate render heights
  container.scrollTop = container.scrollHeight;

  // Detect heavy media assets inside the newly appended element and trigger a re-scroll after loading
  const mediaElements = container.querySelectorAll<HTMLImageElement | HTMLVideoElement>("img, video");
  mediaElements.forEach((media) => {
    if (media instanceof HTMLImageElement && !media.complete) {
      media.addEventListener(
        "load",
        () => {
          container.scrollTop = container.scrollHeight;
        },
        { once: true }
      );
    }
  });
}

/* ───────────────────────────────────────── */
/* Mount Message                            */
/* ───────────────────────────────────────── */

export function mountMessage(
  msg: ChatMessage,
  {
    pending = false,
    container = getMessageContainer()
  }: MountMessageOptions = {}
): HTMLElement | null {
  const targetContainer =
    container ||
    getMessageContainer() ||
    document.querySelector<HTMLElement>(".chat-messages");

  if (!targetContainer) {
    return null;
  }

  const normalized = normalizeMessagePayload(msg);
  const id = normalizeId(normalized);
  const domId = `msg-${id}`;
  const existingNode = document.getElementById(domId);

  if (existingNode) {
    return existingNode as HTMLElement;
  }

  const node = renderMessage({
    ...normalized,
    pending
  }) as HTMLElement;

  node.id = domId;

  if (pending) {
    node.style.opacity = "0.5";
    node.setAttribute("data-pending", "1");
  }

  targetContainer.appendChild(node);
  scrollToBottom(targetContainer);
  return node;
}

/* ───────────────────────────────────────── */
/* Reconcile Optimistic Message             */
/* ───────────────────────────────────────── */

export function reconcilePending(
  chatid: string | number,
  clientId: string,
  serverMessage: ChatMessage
): void {
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
  const newEl = renderMessage(normalized) as HTMLElement;
  newEl.id = `msg-${serverId}`;

  const targetContainer =
    pending.container ||
    getMessageContainer() ||
    document.querySelector<HTMLElement>(".chat-messages");

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

/* ───────────────────────────────────────── */
/* WebSocket Configuration                  */
/* ───────────────────────────────────────── */

function wsUrl(): string {
  const token = getState("token") as string | undefined;
  let url = (MERE_WS as string).replace(/^http/, "ws") + "/ws/merechat";
  if (token) {
    url += `?token=${encodeURIComponent(token)}`;
  }
  return url;
}

function joinChatRoom(socket: WebSocket | null, chatid: string | number | null): void {
  if (!socket || !chatid) {
    return;
  }
  if (socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(
        JSON.stringify({
          type: "join",
          chatid
        })
      );
    } catch {}
  }
}

export function closeExistingSocket(reason = ""): void {
  const ws = ChatState.getSocket();
  if (ws) {
    // Cleanly unbind closing callbacks before closing manually to prevent infinite reconnect cascades
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.onopen = null;
    try {
      ws.close();
    } catch {}
    ChatState.setSocket(null);
  }

  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  ChatState.resetReconnectAttempts();
}

/* ───────────────────────────────────────── */
/* WebSocket Connection Manager              */
/* ───────────────────────────────────────── */

export function connectWebSocket(): void {
  const existing = ChatState.getSocket();
  if (
    existing &&
    (existing.readyState === WebSocket.OPEN ||
      existing.readyState === WebSocket.CONNECTING)
  ) {
    const chatid = ChatState.getChatId();
    if (existing.readyState === WebSocket.OPEN) {
      joinChatRoom(existing, chatid);
    }
    return;
  }

  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
  }

  let socket: WebSocket;
  try {
    socket = new WebSocket(wsUrl());
  } catch {
    scheduleReconnect();
    return;
  }

  ChatState.setSocket(socket);

  socket.onopen = () => {
    ChatState.resetReconnectAttempts();
    const token = getState("token") as string | undefined;
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

  socket.onmessage = (ev: MessageEvent) => {
    let data: WSPacket;
    try {
      data = JSON.parse(ev.data as string) as WSPacket;
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

function scheduleReconnect(): void {
  const attempts = ChatState.getReconnectAttempts();
  const delay = Math.min(30000, 1000 * Math.pow(2, attempts));
  ChatState.incrementReconnectAttempts();

  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
  }
  reconnectTimer = setTimeout(connectWebSocket, delay);
}

/* ───────────────────────────────────────── */
/* Handle Incoming WebSocket Packets        */
/* ───────────────────────────────────────── */

function handleWSMessage(rawData: WSPacket): void {
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

      playSoundAlert({
        type: "message",
        chatId: String(chatid)
      });

      // Handle message targeting other non-active feeds
      if (String(chatid) !== ChatState.getChatId()) {
        const unread = (getState("unreadMessages") as number) || 0;
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
                body: data.content || "",
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
      if (data.clientId && pendingMap.has(data.clientId)) {
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

export { renderMessage };