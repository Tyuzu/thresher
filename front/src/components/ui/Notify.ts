import "../../../css/ui/Notify.css";
import { createElement } from "../../components/createElement.js"; // Adjust path as needed
import { getState, setState } from "../../state/state.js";
import { playSoundAlert } from "../../services/notifications/soundAlerts.js";
import { addSystemLog } from "../../utils/idxDB.js"; // Import IndexedDB persistence helper

// ---- Types & Interfaces ----

export type NotificationType = "info" | "success" | "error" | "warning";

export interface NotifyOptions {
  title?: string;
  type?: NotificationType;
  duration?: number;
  dismissible?: boolean;
}

function normalizeNotifyOptions(
  options?: NotifyOptions | NotificationType
): NotifyOptions & { type: NotificationType } {
  if (typeof options === "string") {
    return { title: "", type: options as NotificationType, duration: 0, dismissible: true };
  }
  return {
    title: "",
    duration: 0,
    dismissible: true,
    ...options,
    type: options && typeof options === "object" && options.type ? options.type : (typeof options === "string" ? options : "info")
  };
}

/**
 * Creates and renders a floating notification alert node.
 */
const Notify = (
  message: string,
  options?: NotifyOptions | NotificationType
): HTMLDivElement => {
  const { title = "", type = "info", duration = 0, dismissible = true } = normalizeNotifyOptions(options);
  // Track browser window timeouts
  let hideTimeoutId: number | null = null;
  let removeTimeoutId: number | null = null;

  const removeNotification = (): void => {
    if (hideTimeoutId !== null) window.clearTimeout(hideTimeoutId);
    if (removeTimeoutId !== null) window.clearTimeout(removeTimeoutId);
    notify.remove();
  };

  const children: (HTMLElement | string)[] = [message];

  if (dismissible) {
    const closeBtn = createElement(
      "button",
      {
        class: "notify-close",
        "aria-label": "Close",
        events: {
          click: removeNotification,
        },
      },
      ["×"]
    );
    children.push(closeBtn);
  }

  const notify = createElement(
    "div",
    {
      class: `notify ${type}`,
      role: "alert",
      "aria-live": "assertive",
    },
    children
  ) as HTMLDivElement;

  const containerId = "notify-container";
  let container = document.getElementById(containerId) as HTMLDivElement | null;
  if (!container) {
    container = createElement("div", {
      id: containerId,
      class: "notify-container",
    }) as HTMLDivElement;

    // Fall back safely to document.body if '#app' isn't in the DOM yet
    const appRoot = document.getElementById("app") || document.body;
    appRoot.appendChild(container);
  }

  container.appendChild(notify);

  // Auto-dismiss logic using window.setTimeout
  const timeout = duration || Math.max(3000, message.length * 50);
  hideTimeoutId = window.setTimeout(() => {
    notify.classList.add("hide");
    removeTimeoutId = window.setTimeout(() => notify.remove(), 500);
  }, timeout);

  // Global app state & Side Effects
  setState("unreadNotifications", ((getState("unreadNotifications") as number) || 0) + 1);
  playSoundAlert({ type: "notification" });

  // Persistent System Log Storage (Async save to IndexedDB)
  addSystemLog({
    title: title || type.charAt(0).toUpperCase() + type.slice(1) + " Alert",
    message: message,
    type: type,
  }).catch((err: unknown) => {
    console.error("Failed to persist notification to IndexedDB:", err);
  });

  return notify;
};

export default Notify;