import "../../../css/ui/Notify.css";
import { getState, setState } from "../../state/state.js";
import { playSoundAlert } from "../../utils/soundAlerts.js";
import { buildNotificationPayload, persistNotification } from "../../utils/notificationPersistence.js";

const Notify = (message, {
  type = 'info',
  duration = 0,              // 0 = auto based on message length
  dismissible = true,
} = {}) => {
  const notify = document.createElement('div');
  notify.className = `notify ${type}`;
  notify.setAttribute("role", "alert");
  notify.setAttribute("aria-live", "assertive");
  notify.textContent = message;

  // Track timeouts so we can clear them if dismissed early
  let hideTimeoutId = null;
  let removeTimeoutId = null;

  const removeNotification = () => {
    if (hideTimeoutId) clearTimeout(hideTimeoutId);
    if (removeTimeoutId) clearTimeout(removeTimeoutId);
    notify.remove();
  };

  if (dismissible) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notify-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', removeNotification);
    notify.appendChild(closeBtn);
  }

  const containerId = "notify-container";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "notify-container";
    
    // Fall back safely to document.body if '#app' isn't in the DOM yet
    const appRoot = document.getElementById("app") || document.body;
    appRoot.appendChild(container);
  }

  container.appendChild(notify);

  // Auto-dismiss logic
  const timeout = duration || Math.max(3000, message.length * 50);
  hideTimeoutId = setTimeout(() => {
    notify.classList.add("hide");
    removeTimeoutId = setTimeout(() => notify.remove(), 500);
  }, timeout);

  // Global app state & Side Effects
  setState("unreadNotifications", (getState("unreadNotifications") || 0) + 1);
  playSoundAlert({ type: "notification" });

  const payload = buildNotificationPayload({
    type,
    title: type === "error" ? "Alert" : "New notification",
    message,
    entityType: "notify"
  });

  persistNotification(payload).catch(() => {});
  
  return notify;
};

export default Notify;