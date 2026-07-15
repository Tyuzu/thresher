import { createElement } from "../../components/createElement.js";
import { CHAT_WS, getState, setState, state } from "../../state/state.js";
import { renderMessage } from "./renderMessage.js";
import { setupFileUpload } from "./fileUpload.js";
import { playSoundAlert, setChatSoundPreference, resolveSoundPreference } from "../notifications/soundAlerts.js";

let activeSocket = null;

export function displayNewChat(
  contentContainer,
  chatid,
  isLoggedIn,
  currentUserId
) {
  clearContainer(contentContainer);

  cleanupChat();

  const chatBox = createElement("div", {
    class: "chat-box"
  });

  const messagesContainer = createElement("div", {
    id: "messages",
    class: "messages-container"
  });

  let socket = null;

  if (isLoggedIn) {
    socket = createWebSocket(chatid);
    activeSocket = socket;
  }

  const messageSoundPreference = resolveSoundPreference({ type: "message", chatId: chatid });
  const notificationSoundPreference = resolveSoundPreference({ type: "notification", chatId: chatid });

  const {
    inputRow,
    inputField,
    sendButton
  } = createInputRow(socket);

  const soundControls = createChatSoundControls(chatid, messageSoundPreference, notificationSoundPreference);

  const {
    fileInput,
    uploadButton,
    dropZone,
    progressBar
  } = createUploadElements();

  const upcon = createElement(
    "div",
    { class: "upcon" },
    [
      soundControls,
      inputRow,
      fileInput,
      uploadButton,
      progressBar,
      dropZone
    ]
  );

  if (!isLoggedIn) {
    disableInputs([
      inputField,
      sendButton,
      fileInput,
      uploadButton
    ]);

    chatBox.append(
      createElement(
        "div",
        { class: "login-warning" },
        ["You are not logged in."]
      )
    );
  }

  chatBox.append(messagesContainer, upcon);
  contentContainer.appendChild(chatBox);

  if (!isLoggedIn || !socket) {
    return;
  }

  setupSocketListeners(
    socket,
    messagesContainer,
    currentUserId,
    sendButton,
    chatid
  );

  setupFileUpload(
    fileInput,
    uploadButton,
    dropZone,
    chatid,
    progressBar
  );
}

export function cleanupChat() {
  if (activeSocket) {
    activeSocket.close();
    activeSocket = null;
  }
}

/* ------------------ Helpers ------------------ */

function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function createInputRow(socket) {
  const inputField = createElement("input", {
    type: "text",
    placeholder: "Type a message…",
    id: "messageInput",
    class: "message-input"
  });

  function sendMessage() {
    const content = inputField.value.trim();

    if (!content) {
      return;
    }

    if (
      !socket ||
      socket.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    socket.send(
      JSON.stringify({
        action: "chat",
        content
      })
    );

    inputField.value = "";
  }

  inputField.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  const sendButton = createElement(
    "button",
    {
      type: "button",
      class: "send-button",
      disabled: true,
      events: {
        click: sendMessage
      }
    },
    ["Send"]
  );

  const inputRow = createElement(
    "div",
    { class: "input-row" },
    [inputField, sendButton]
  );

  return {
    inputRow,
    inputField,
    sendButton
  };
}

function createChatSoundControls(chatid, messagePreference, notificationPreference) {
  const container = createElement("div", {
    class: "chat-sound-controls",
    style: {
      display: "flex",
      gap: "0.5rem",
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: "0.5rem"
    }
  });

  const messageTone = createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
      fontSize: "0.8rem"
    }
  }, [
    "Message tone",
    createElement("select", {
      value: messagePreference.tone,
      onchange: e => {
        setChatSoundPreference(chatid, {
          messageTone: e.target.value
        });
      }
    }, [
      createElement("option", { value: "default" }, ["Default"]),
      createElement("option", { value: "chime" }, ["Chime"]),
      createElement("option", { value: "sharp" }, ["Sharp"])
    ])
  ]);

  const notificationTone = createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
      fontSize: "0.8rem"
    }
  }, [
    "Notification tone",
    createElement("select", {
      value: notificationPreference.tone,
      onchange: e => {
        setChatSoundPreference(chatid, {
          notificationTone: e.target.value
        });
      }
    }, [
      createElement("option", { value: "default" }, ["Default"]),
      createElement("option", { value: "chime" }, ["Chime"]),
      createElement("option", { value: "sharp" }, ["Sharp"])
    ])
  ]);

  container.append(messageTone, notificationTone);
  return container;
}

function createUploadElements() {
  const fileInput = createElement("input", {
    type: "file",
    accept: "image/*",
    class: "file-input",
    multiple: true
  });

  const uploadButton = createElement(
    "button",
    {
      type: "button",
      class: "upload-button"
    },
    ["Upload"]
  );

  const dropZone = createElement(
    "div",
    {
      class: "drop-zone",
      events: {
        dragover(e) {
          e.preventDefault();
        },
        drop(e) {
          e.preventDefault();
        }
      }
    },
    ["Drag & drop files here"]
  );

  const progressBar = createElement("progress", {
    value: 0,
    max: 100,
    class: "upload-progress",
    style: {
      display: "none"
    }
  });

  return {
    fileInput,
    uploadButton,
    dropZone,
    progressBar
  };
}

function disableInputs(elements) {
  elements.forEach(el => {
    if (el) {
      el.disabled = true;
    }
  });
}

function createWebSocket(chatid) {
  const token = state.token ?? "";

  let base = CHAT_WS.replace(/\/+$/, "");

  if (
    !base.startsWith("ws://") &&
    !base.startsWith("wss://")
  ) {
    const protocol =
      location.protocol === "https:"
        ? "wss"
        : "ws";

    base = `${protocol}://${base}`;
  }

  return new WebSocket(
    `${base}/${encodeURIComponent(
      chatid
    )}?token=${encodeURIComponent(token)}`
  );
}

function setupSocketListeners(
  socket,
  messagesContainer,
  currentUserId,
  sendButton,
  chatid
) {
  if (!socket) {
    return;
  }

  socket.addEventListener("open", () => {
    if (socket !== activeSocket) {
      return;
    }

    sendButton.disabled = false;
  });

  socket.addEventListener("close", () => {
    if (socket !== activeSocket) {
      return;
    }

    sendButton.disabled = true;
  });

  socket.addEventListener("error", err => {
    if (socket !== activeSocket) {
      return;
    }

    console.error("WebSocket error:", err);
    sendButton.disabled = true;
  });

  socket.addEventListener("message", async event => {
    if (socket !== activeSocket) {
      return;
    }

    const unread = getState("unreadMessages") || 0;

    setState("unreadMessages", unread + 1);

    try {
      const msg = JSON.parse(event.data);
      const isOwn =
        msg?.senderid === currentUserId ||
        msg?.userId === currentUserId;

      if (!isOwn) {
        playSoundAlert({ type: "message", chatId: chatid });
      }

      await renderMessage(
        msg,
        messagesContainer,
        currentUserId,
        socket
      );

      messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
    } catch (err) {
      console.error(
        "Invalid WebSocket payload:",
        err
      );
    }
  });
}