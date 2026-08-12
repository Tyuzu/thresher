import "../../../css/ui/Notify.css";
import { createElement } from "../../components/createElement.js"; // Adjust path as needed
import { getState, setState } from "../../state/state.js";
import { playSoundAlert } from "../../services/notifications/soundAlerts.js";

const Notify = (message, {
  type = 'info',
  duration = 0,              // 0 = auto based on message length
  dismissible = true,
} = {}) => {
  // Track timeouts so we can clear them if dismissed early
  let hideTimeoutId = null;
  let removeTimeoutId = null;

  const removeNotification = () => {
    if (hideTimeoutId) clearTimeout(hideTimeoutId);
    if (removeTimeoutId) clearTimeout(removeTimeoutId);
    notify.remove();
  };

  const children = [message];

  if (dismissible) {
    const closeBtn = createElement('button', {
      class: 'notify-close',
      'aria-label': 'Close',
      events: {
        click: removeNotification
      }
    }, ['×']);
    children.push(closeBtn);
  }

  const notify = createElement('div', {
    class: `notify ${type}`,
    role: 'alert',
    'aria-live': 'assertive'
  }, children);

  const containerId = "notify-container";
  let container = document.getElementById(containerId);
  if (!container) {
    container = createElement("div", {
      id: containerId,
      class: "notify-container"
    });

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

  return notify;
};

export default Notify;