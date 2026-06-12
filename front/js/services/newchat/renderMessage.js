import { createElement } from "../../components/createElement.js";
import {
  resolveImagePath,
  EntityType,
  PictureType
} from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { setupMessageActions } from "./setupMessageActions.js";
import { renderMedia } from "../merechats/components/renderMedia.js";

export async function renderMessage(
  msg,
  container,
  currentUserId,
  socket
) {
  if (
    !msg ||
    (
      !msg.id &&
      !msg.messageid &&
      !msg.content &&
      !msg.files?.length
    )
  ) {
    return;
  }

  const messageId =
    msg.id ??
    msg.messageid ??
    `temp-${Date.now()}`;

  let wrapper = document.getElementById(
    `msg-${messageId}`
  );

  const isUpdate = Boolean(wrapper);

  if (!wrapper) {
    wrapper = createElement("article", {
      id: `msg-${messageId}`,
      class: "chat-message-wrapper",
      role: "group",
      "aria-label": "Chat message"
    });

    container.appendChild(wrapper);
  } else {
    while (wrapper.firstChild) {
      wrapper.removeChild(
        wrapper.firstChild
      );
    }
  }

  const isOwn =
    msg.senderid === currentUserId ||
    msg.userId === currentUserId;

  wrapper.classList.toggle(
    "chat-message-own",
    isOwn
  );

  /* ---------- Timestamp ---------- */

  const timestamp =
    typeof msg.timestamp === "number"
      ? msg.timestamp * 1000
      : Date.parse(msg.timestamp);

  const date = new Date(
    Number.isFinite(timestamp)
      ? timestamp
      : Date.now()
  );

  const timeText =
    Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        });

  /* ---------- Message Content ---------- */

  let contentNode;

  if (
    Array.isArray(msg.files) &&
    msg.files.length > 0
  ) {
    const media = msg.files.map(
      file => {
        const filename = String(
          file?.filename || ""
        ).trim();

        const ext = filename.includes(".")
          ? filename
              .split(".")
              .pop()
              .toLowerCase()
          : "";

        let type = "file";
        let mimeType = "";

        if (
          [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp",
            "svg"
          ].includes(ext)
        ) {
          type = "image";
          mimeType =
            ext === "jpg"
              ? "image/jpeg"
              : `image/${ext}`;
        } else if (
          [
            "mp4",
            "webm",
            "ogg",
            "mov"
          ].includes(ext)
        ) {
          type = "video";
          mimeType = `video/${ext}`;
        } else if (
          [
            "mp3",
            "wav",
            "ogg",
            "m4a"
          ].includes(ext)
        ) {
          type = "audio";
          mimeType = `audio/${ext}`;
        }

        return {
          type,
          mimeType,
          extn: ext,
          url:
            file?.path?.trim() ||
            filename
        };
      }
    );

    contentNode =
      renderMedia({ media }) ??
      createElement(
        "p",
        {
          class:
            "chat-message-text system-msg"
        },
        ["[media unavailable]"]
      );
  } else {
    contentNode = createElement(
      "span",
      {
        class:
          "message-content chat-message-text"
      },
      [msg.content || ""]
    );
  }

  /* ---------- Time ---------- */

  const timeNode = createElement(
    "time",
    {
      class: "chat-message-time",
      datetime:
        Number.isNaN(
          date.getTime()
        )
          ? ""
          : date.toISOString(),
      "aria-label":
        timeText
          ? `Sent at ${timeText}`
          : "Message time"
    },
    [timeText]
  );

  /* ---------- Avatar ---------- */

  const avatarUrl =
    msg.senderid
      ? resolveImagePath(
          EntityType.USER,
          PictureType.THUMB,
          `${msg.senderid}.jpg`
        )
      : "";

  const avatarNode = Imagex({
    src: avatarUrl,
    alt: "User avatar",
    classes:
      "chat-message-avatar"
  });

  /* ---------- Bubble ---------- */

  const bubble = createElement(
    "section",
    {
      class:
        "chat-message-bubble",
      role: "group",
      "aria-label":
        "Message content"
    }
  );

  bubble.append(
    contentNode,
    timeNode
  );

  const fragment =
    document.createDocumentFragment();

  fragment.append(
    avatarNode,
    bubble
  );

  if (isOwn && socket) {
    fragment.appendChild(
      setupMessageActions(
        msg,
        socket
      )
    );
  }

  wrapper.appendChild(
    fragment
  );

  if (!isUpdate) {
    container.scrollTop =
      container.scrollHeight;
  }
}