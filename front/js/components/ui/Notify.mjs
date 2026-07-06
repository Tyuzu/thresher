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

  if (dismissible) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notify-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => notify.remove());
    notify.appendChild(closeBtn);
  }

  const containerId = "notify-container";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "notify-container";
    document.getElementById("app").appendChild(container);
  }

  container.appendChild(notify);

  const timeout = duration || Math.max(3000, message.length * 50);
  const autoRemove = setTimeout(() => {
    notify.classList.add("hide");
    setTimeout(() => notify.remove(), 500);
  }, timeout);

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
