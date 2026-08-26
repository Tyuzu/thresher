import { createElement } from "../../../components/createElement.js";
import { getState } from "../../../state/state.js";
import { renderAvatar } from "./renderAvatar.js";
import { renderMedia } from "./renderMedia.js";
import { renderMenu } from "./renderMenu.js";

/* -------------------------
   Interfaces & Types
--------------------------*/
export interface User {
  id?: string | number;
  userid?: string | number;
  [key: string]: unknown;
}

export interface RawMessage {
  id?: string | number;
  messageid?: string | number;
  sender?: string | number | User | null;
  senderName?: string;
  userid?: string | number;
  content?: string;
  media?: unknown;
  deleted?: boolean;
  editedAt?: string | number | Date | null;
  createdAt?: string | number | Date | null;
  status?: "sent" | "delivered" | "read" | string | null;
  [key: string]: unknown;
}

export interface NormalizedMessage {
  id: string;
  senderLabel: string;
  isMine: boolean;
  content: string;
  isDeleted: boolean;
  hasMedia: boolean;
  edited: boolean;
  status: string | null;
  time: string;
}

/* -------------------------
   Normalize Message
--------------------------*/
function normalizeMessage(
  msg: RawMessage,
  currentUser?: string | User | null
): NormalizedMessage {
  const currentUserId =
    typeof currentUser === "object" && currentUser !== null
      ? currentUser.id || currentUser.userid
      : currentUser;

  const senderId =
    typeof msg.sender === "object" && msg.sender !== null
      ? msg.sender.id || msg.sender.userid
      : msg.sender;

  const isMine = !!currentUserId && (msg.sender === currentUser || senderId === currentUserId);

  const createdAt = msg.createdAt ? new Date(msg.createdAt) : null;

  return {
    id: String(msg.messageid || msg.id || ""),
    senderLabel: String(msg.userid || msg.senderName || msg.sender || "Unknown"),
    isMine,
    content: msg.deleted
      ? "[deleted]"
      : String(msg.content || "").trim(),
    isDeleted: !!msg.deleted,
    hasMedia: !!msg.media,
    edited: !!msg.editedAt,
    status: isMine && msg.status ? String(msg.status) : null,
    time:
      createdAt && !isNaN(createdAt.getTime())
        ? createdAt.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit"
          })
        : ""
  };
}

/* -------------------------
   Helpers
--------------------------*/
function getMessageClasses(data: NormalizedMessage): string {
  return [
    "message-item",
    data.isMine ? "mine" : "theirs",
    data.isDeleted && "deleted",
    data.hasMedia && "attachment"
  ]
    .filter((cls): cls is string => Boolean(cls))
    .join(" ");
}

/* -------------------------
   Header Renderer
--------------------------*/
function renderHeader(data: NormalizedMessage, msg: RawMessage): ReturnType<typeof createElement> {
  const children = [
    createElement(
      "span",
      { class: "msg-sender", tabIndex: "0" },
      [data.senderLabel]
    ),

    createElement(
      "span",
      { class: "msg-time" },
      [data.time]
    ),

    data.edited
      ? createElement(
          "span",
          { class: "msg-edited" },
          [" (edited)"]
        )
      : null,

    renderMenu(msg),

    data.status
      ? createElement(
          "span",
          { class: "msg-status" },
          [data.status === "read" ? "✓✓" : "✓"]
        )
      : null
  ].filter(Boolean);

  return createElement(
    "div",
    { class: "msg-header" },
    children
  );
}

/* -------------------------
   Body Renderer
--------------------------*/
function renderBody(data: NormalizedMessage, msg: RawMessage): ReturnType<typeof createElement> {
  const nodes: Array<Node | string | number | HTMLElement> = [];

  if (data.content) {
    const text =
      data.content.length > 300
        ? data.content.slice(0, 300) + "…"
        : data.content;

    nodes.push(text);
  }

  const mediaNode = renderMedia(msg as any);
  if (mediaNode) {
    nodes.push(mediaNode);
  }

  return createElement(
    "div",
    { class: "msg-content" },
    nodes
  );
}

/* -------------------------
   Message Renderer
--------------------------*/
export function renderMessage(msg: RawMessage): ReturnType<typeof createElement> {
  const user = getState("user")?.userid as string | User | undefined;
  const data = normalizeMessage(msg, user);

  const avatar = renderAvatar(msg as any, {
    isMine: data.isMine
  });

  const body = createElement(
    "div",
    { class: "msg-body" },
    [
      renderHeader(data, msg),
      renderBody(data, msg)
    ]
  );

  return createElement(
    "div",
    {
      class: getMessageClasses(data),
      dataset: { id: data.id },
      role: "article",
      tabIndex: "0",
      "aria-label": `Message at ${data.time}`
    },
    [avatar, body]
  );
}