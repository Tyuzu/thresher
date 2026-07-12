import { createElement } from "../../../components/createElement.js";
import { getState } from "../../../state/state.js";
import { renderAvatar } from "./renderAvatar.js";
import { renderMedia } from "./renderMedia.js";
import { renderMenu } from "./renderMenu.js";

/* -------------------------
   Normalize Message
--------------------------*/
function normalizeMessage(msg, currentUser) {
  const isMine =
    msg.sender === currentUser ||
    msg.sender?.id === currentUser?.id;

  const createdAt = msg.createdAt ? new Date(msg.createdAt) : null;

  return {
    id: msg.messageid || msg.id || "",
    senderLabel:
      msg.userid || msg.senderName || msg.sender || "Unknown",
    isMine,
    content: msg.deleted
      ? "[deleted]"
      : String(msg.content || "").trim(),
    isDeleted: !!msg.deleted,
    hasMedia: !!msg.media,
    edited: !!msg.editedAt,
    status: isMine ? msg.status : null,
    time:
      createdAt && !isNaN(createdAt)
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
function getMessageClasses(data) {
  return [
    "message-item",
    data.isMine ? "mine" : "theirs",
    data.isDeleted && "deleted",
    data.hasMedia && "attachment"
  ]
    .filter(Boolean)
    .join(" ");
}

/* -------------------------
   Header Renderer
--------------------------*/
function renderHeader(data, msg) {
  return createElement(
    "div",
    { class: "msg-header" },
    [
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

      data.edited &&
      createElement(
        "span",
        { class: "msg-edited" },
        [" (edited)"]
      ),

      renderMenu(msg),

      data.status &&
      createElement(
        "span",
        { class: "msg-status" },
        [data.status === "read" ? "✓✓" : "✓"]
      )
    ].filter(Boolean)
  );
}

/* -------------------------
   Body Renderer
--------------------------*/
function renderBody(data, msg) {
  const nodes = [];

  if (data.content) {
    const text =
      data.content.length > 300
        ? data.content.slice(0, 300) + "…"
        : data.content;

    nodes.push(text);
  }
  const mediaNode = renderMedia(msg);
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
export function renderMessage(msg) {
  const user = getState("user");
  const data = normalizeMessage(msg, user);

  const avatar = renderAvatar(msg, {
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
