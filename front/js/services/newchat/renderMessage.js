import { createElement } from "../../components/createElement.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { setupMessageActions } from "./setupMessageActions.js";
import { renderMedia } from "../merechats/components/renderMedia.js"; // adjust import path if needed

export async function renderMessage(msg, container, currentUserId, socket) {
  if (!msg || (!msg.id && !msg.messageid && !msg.content && !msg.files)) {
    return;
  }

  const messageId = msg.id || msg.messageid || `temp-${msg.timestamp}`;
  let wrapper = document.getElementById(`msg-${messageId}`);

  if (!wrapper) {
    wrapper = createElement("article", {
      class: "chat-message-wrapper",
      id: `msg-${messageId}`,
      role: "group",
      "aria-label": "Chat message"
    });

    container.appendChild(wrapper);
  } else {
    wrapper.innerHTML = "";
  }

  const timeStr = new Date(msg.timestamp * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  const isOwn =
    msg.senderid === currentUserId ||
    msg.userId === currentUserId;

  let contentNode;

  if (msg.files?.length > 0) {
    const media = msg.files.map(file => {
      const filename = String(file.filename || "").trim();
      const ext = filename.includes(".")
        ? filename.split(".").pop().toLowerCase()
        : "";

      let type = "file";
      let mimeType = "";

      if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
        type = "image";
        mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
      } else if (["mp4", "webm", "ogg"].includes(ext)) {
        type = "video";
        mimeType = `video/${ext}`;
      } else if (["mp3", "wav"].includes(ext)) {
        type = "audio";
        mimeType = `audio/${ext}`;
      }

      return {
        type,
        mimeType,
        extn: ext,
        url: file.path?.trim()
          ? file.path
          : filename
      };
    });

    contentNode = renderMedia({ media });

    if (!contentNode) {
      contentNode = createElement(
        "p",
        { class: "chat-message-text system-msg" },
        ["[media unavailable]"]
      );
    }
  } else if (msg.content) {
    contentNode = createElement(
      "p",
      { class: "chat-message-text" },
      [msg.content]
    );
  } else {
    contentNode = createElement(
      "p",
      { class: "chat-message-text system-msg" },
      [""]
    );
  }

  const timeNode = createElement(
    "time",
    {
      class: "chat-message-time",
      datetime: new Date(msg.timestamp * 1000).toISOString(),
      "aria-label": `Sent at ${timeStr}`
    },
    [timeStr]
  );

  const avatarUrl = resolveImagePath(
    EntityType.USER,
    PictureType.THUMB,
    `${msg.senderid}.jpg`
  );

  const avatarNode = Imagex({
    src: avatarUrl,
    alt: "User avatar",
    classes: "chat-message-avatar"
  });

  const bubble = createElement(
    "section",
    {
      class: "chat-message-bubble",
      role: "group",
      "aria-label": "Message content"
    },
    [contentNode, timeNode]
  );

  wrapper.append(avatarNode, bubble);

  if (isOwn && socket) {
    wrapper.appendChild(setupMessageActions(msg, socket));
  }

  container.scrollTop = container.scrollHeight;
}