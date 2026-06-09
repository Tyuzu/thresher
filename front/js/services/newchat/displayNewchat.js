import { createElement } from "../../components/createElement.js";
import { CHAT_WS, state } from "../../state/state.js";
import { renderMessage } from "./renderMessage.js";
import { setupFileUpload } from "./fileUpload.js";

let activeSocket = null;

export function displayNewChat(
  contentContainer,
  chatid,
  isLoggedIn,
  currentUserId
) {
  clearContainer(contentContainer);

  if (activeSocket) {
    activeSocket.close();
    activeSocket = null;
  }

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

  const { inputRow, inputField, sendButton } =
    createInputRow(socket);

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

  if (!isLoggedIn) {
    return;
  }

  setupSocketListeners(
    socket,
    messagesContainer,
    currentUserId,
    sendButton
  );

  setupFileUpload(
    fileInput,
    uploadButton,
    dropZone,
    chatid,
    progressBar
  );
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
    class: "message-input",
    events: {
      keydown(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          sendButton.click();
        }
      }
    }
  });

  const sendButton = createElement(
    "button",
    {
      type: "button",
      class: "send-button",
      disabled: true,
      events: {
        click() {
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
    el.disabled = true;
  });
}

function createWebSocket(chatid) {
  const token = state.token ?? "";

  let base = CHAT_WS;

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
  sendButton
) {
  socket.addEventListener("open", () => {
    sendButton.disabled = false;
  });

  socket.addEventListener("close", () => {
    sendButton.disabled = true;
  });

  socket.addEventListener("error", err => {
    console.error("WebSocket error:", err);
    sendButton.disabled = true;
  });

  socket.addEventListener("message", async event => {
    try {
      const msg = JSON.parse(event.data);

      await renderMessage(
        msg,
        messagesContainer,
        currentUserId,
        socket
      );
    } catch (err) {
      console.error("Invalid WS payload", err);
    }
  });
}