import { createElement } from "../../components/createElement.js";
import { CHAT_WS, getState, setState } from "../../state/state.js";
import { renderMessage } from "./renderMessage.js";
import { setupFileUpload } from "./fileUpload.js";
import { playSoundAlert, setChatSoundPreference, resolveSoundPreference } from "../notifications/soundAlerts.js";

let activeSocket: WebSocket | null = null;

export interface SoundPreference {
  tone?: string;
}

export interface InputRowElements {
  inputRow: HTMLElement;
  inputField: HTMLInputElement;
  sendButton: HTMLButtonElement;
}

export interface UploadElements {
  fileInput: HTMLInputElement;
  uploadButton: HTMLButtonElement;
  dropZone: HTMLElement;
  progressBar: HTMLProgressElement;
}

export function displayNewChat(
  contentContainer: HTMLElement,
  chatid: string | number,
  isLoggedIn: boolean,
  currentUserId: string | number
): void {
  clearContainer(contentContainer);
  cleanupChat();

  const chatBox = createElement("div", {
    class: "chat-box"
  }) as HTMLElement;

  const messagesContainer = createElement("div", {
    id: "messages",
    class: "messages-container"
  }) as HTMLElement;

  let socket: WebSocket | null = null;
  if (isLoggedIn) {
    socket = createWebSocket(chatid);
    activeSocket = socket;
  }

  const messageSoundPreference = resolveSoundPreference({ type: "message", chatId: String(chatid) }) as SoundPreference;
  const notificationSoundPreference = resolveSoundPreference({ type: "notification", chatId: String(chatid) }) as SoundPreference;

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
  ) as HTMLElement;

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

export function cleanupChat(): void {
  if (activeSocket) {
    activeSocket.close();
    activeSocket = null;
  }
}

/* ------------------ Helpers ------------------ */

function clearContainer(container: HTMLElement): void {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function createInputRow(socket: WebSocket | null): InputRowElements {
  const inputField = createElement("input", {
    type: "text",
    placeholder: "Type a message…",
    id: "messageInput",
    class: "message-input"
  }) as HTMLInputElement;

  function sendMessage(): void {
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

  inputField.addEventListener("keydown", (e: KeyboardEvent) => {
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
        click: sendMessage as EventListener
      }
    },
    ["Send"]
  ) as HTMLButtonElement;

  const inputRow = createElement(
    "div",
    { class: "input-row" },
    [inputField, sendButton]
  ) as HTMLElement;

  return {
    inputRow,
    inputField,
    sendButton
  };
}

function createChatSoundControls(
  chatid: string | number,
  messagePreference?: SoundPreference,
  notificationPreference?: SoundPreference
): HTMLElement {
  const container = createElement("div", {
    class: "chat-sound-controls",
    style: {
      display: "flex",
      gap: "0.5rem",
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: "0.5rem"
    }
  }) as HTMLElement;

  const buildOptions = (currentVal?: string): HTMLElement[] => [
    createElement("option", { value: "default", ...(currentVal === "default" && { selected: true }) }, ["Default"]) as HTMLElement,
    createElement("option", { value: "chime", ...(currentVal === "chime" && { selected: true }) }, ["Chime"]) as HTMLElement,
    createElement("option", { value: "sharp", ...(currentVal === "sharp" && { selected: true }) }, ["Sharp"]) as HTMLElement
  ];

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
      events: {
        change: ((e: Event) => {
          const target = e.target as HTMLSelectElement;
          setChatSoundPreference(String(chatid), {
            messageTone: target.value
          });
        }) as EventListener
      }
    }, buildOptions(messagePreference?.tone))
  ]) as HTMLElement;

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
      events: {
        change: ((e: Event) => {
          const target = e.target as HTMLSelectElement;
          setChatSoundPreference(String(chatid), {
            notificationTone: target.value
          });
        }) as EventListener
      }
    }, buildOptions(notificationPreference?.tone))
  ]) as HTMLElement;

  container.append(messageTone, notificationTone);
  return container;
}

function createUploadElements(): UploadElements {
  const fileInput = createElement("input", {
    type: "file",
    accept: "image/*",
    class: "file-input",
    multiple: true
  }) as HTMLInputElement;

  const uploadButton = createElement(
    "button",
    {
      type: "button",
      class: "upload-button"
    },
    ["Upload"]
  ) as HTMLButtonElement;

  const dropZone = createElement(
    "div",
    {
      class: "drop-zone",
      events: {
        dragover: ((e: DragEvent) => {
          e.preventDefault();
        }) as EventListener,
        drop: ((e: DragEvent) => {
          e.preventDefault();
        }) as EventListener
      }
    },
    ["Drag & drop files here"]
  ) as HTMLElement;

  const progressBar = createElement("progress", {
    value: 0,
    max: 100,
    class: "upload-progress",
    style: {
      display: "none"
    }
  }) as HTMLProgressElement;

  return {
    fileInput,
    uploadButton,
    dropZone,
    progressBar
  };
}

function disableInputs(elements: (HTMLInputElement | HTMLButtonElement | null)[]): void {
  elements.forEach(el => {
    if (el) {
      el.disabled = true;
    }
  });
}

function createWebSocket(chatid: string | number): WebSocket {
  const token: string = getState("token") ?? "";
  let base: string = CHAT_WS.replace(/\/+$/, "");

  if (
    !base.startsWith("ws://") &&
    !base.startsWith("wss://")
  ) {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    base = `${protocol}://${base}`;
  }

  return new WebSocket(
    `${base}/${encodeURIComponent(chatid)}?token=${encodeURIComponent(token)}`
  );
}

function setupSocketListeners(
  socket: WebSocket,
  messagesContainer: HTMLElement,
  currentUserId: string | number,
  sendButton: HTMLButtonElement,
  chatid: string | number
): void {
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

  socket.addEventListener("error", (err: Event) => {
    if (socket !== activeSocket) {
      return;
    }
    console.error("WebSocket error:", err);
    sendButton.disabled = true;
  });

  socket.addEventListener("message", async (event: MessageEvent) => {
    if (socket !== activeSocket) {
      return;
    }

    try {
      const msg = JSON.parse(event.data);
      const isOwn =
        msg?.senderid === currentUserId ||
        msg?.userid === currentUserId;

      const isWindowHidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      
      if (!isOwn) {
        playSoundAlert({ type: "message", chatId: String(chatid) });
        
        if (isWindowHidden) {
          const unread: number = getState("unreadMessages") || 0;
          setState("unreadMessages", unread + 1);
        }
      }

      await renderMessage(
        msg,
        messagesContainer,
        currentUserId,
        socket
      );

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (err) {
      console.error("Invalid WebSocket payload:", err);
    }
  });
}