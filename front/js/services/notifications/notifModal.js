import Modal from "../../components/ui/Modal.mjs";
import { createElement } from "../../components/createElement.js";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications
} from "./notifService.js";

// Utility: Modern Relative Time Formatter
function timeAgo(dateInput) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const seconds = Math.floor((new Date() - date) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), "hour");
  if (seconds < 2592000) return formatter.format(-Math.floor(seconds / 86400), "day");

  return date.toLocaleDateString();
}

// Utility: Safe User ID extraction
function getUserId() {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user.id || user._id || userStr;
  } catch {
    return localStorage.getItem("user");
  }
}

export async function openNotificationsModal() {
  const userId = getUserId();

  // Container element
  const content = createElement("div", {
    style: "display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto; padding: 0.5rem;",
  });

  // Render initial loading state
  const loadingState = createElement("div", {
    style: "text-align: center; color: #888; padding: 2rem; font-size: 0.9rem;",
  }, ["Loading notifications..."]);
  content.appendChild(loadingState);

  // Mount modal immediately for responsiveness
  Modal({
    title: "📬 Notifications",
    content: content,
    size: "medium",
    showCloseButton: true,
  });

  // Fetch notifications using extracted API service
  const notifications = userId ? await getNotifications() : [];

  // Clear loading state
  content.innerHTML = "";

  // Render empty state if no notifications found
  if (!notifications.length) {
    content.appendChild(
      createElement("div", { style: "text-align: center; color: #666; padding: 2rem 0;" }, [
        createElement("p", { style: "font-weight: 600; margin-bottom: 0.25rem;" }, ["🔔 No notifications"]),
        createElement("p", { style: "font-size: 0.85rem; color: #888; margin: 0;" }, ["You're all caught up!"]),
      ])
    );
    return;
  }

  // Render List
  const listContainer = createElement("div", { style: "display: flex; flex-direction: column; gap: 0.75rem;" });

  notifications.forEach((n) => {
    const notifItem = createNotificationCard(n, userId, () => {
      checkEmptyState();
    });
    listContainer.appendChild(notifItem);
  });

  content.appendChild(listContainer);

  // Render Bottom Action Bar
  const actionBar = createActionBar(userId, notifications, () => {
    listContainer.innerHTML = "";
    checkEmptyState();
  });

  if (actionBar) {
    content.appendChild(actionBar);
  }

  function checkEmptyState() {
    const hasItems = listContainer.children.length > 0;
    if (!hasItems) {
      if (actionBar) actionBar.remove();
      content.appendChild(
        createElement("div", { style: "text-align: center; color: #666; padding: 2rem 0;" }, [
          createElement("p", { style: "font-size: 0.9rem; color: #888;" }, ["No notifications remain."]),
        ])
      );
    }
  }
}

// Sub-component: Individual Notification Card
function createNotificationCard(n, userId, onChange) {
  let isRead = n.isRead;

  const leftContent = createElement("div", { style: "flex: 1; min-width: 0;" }, [
    createElement("strong", {
      style: `display: block; margin-bottom: 0.25rem; font-size: 0.95rem; color: ${isRead ? "#555" : "#111"};`,
    }, [n.title || n.type || "Notification"]),
    createElement("p", {
      style: "margin: 0; font-size: 0.85rem; color: #666; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;",
    }, [n.message || "No details provided."]),
    createElement("small", {
      style: "color: #999; font-size: 0.8rem; display: block; margin-top: 0.25rem;",
    }, [timeAgo(n.createdAt)]),
  ]);

  const markReadBtn = createElement("button", {
    style: "background: #007bff; color: white; border: none; padding: 0.35rem 0.7rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer; white-space: nowrap;",
    events: {
      click: async (e) => {
        e.stopPropagation();
        // Optimistic UI update
        isRead = true;
        card.style.background = "#f7f7f7";
        card.style.borderColor = "#ddd";
        markReadBtn.style.display = "none";

        try {
          await markNotificationAsRead(n.id);
        } catch {
          // Revert optimistic update on failure if needed
          isRead = false;
          card.style.background = "#e8f4f8";
          card.style.borderColor = "#b3dfe6";
          markReadBtn.style.display = "inline-block";
        }
      },
    },
  }, ["Mark Read"]);

  const children = [leftContent];
  if (!isRead && userId) children.push(markReadBtn);

  const card = createElement("div", {
    style: `padding: 0.75rem 1rem; border-radius: 6px; background: ${isRead ? "#f7f7f7" : "#e8f4f8"}; border: 1px solid ${isRead ? "#ddd" : "#b3dfe6"}; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; transition: all 0.2s ease;`,
  }, children);

  return card;
}

// Sub-component: Modal Action Bar
function createActionBar(userId, notifications, onClearAll) {
  if (!userId || !notifications.length) return null;

  const actionBarChildren = [];

  const unreadExist = notifications.some((n) => !n.isRead);
  if (unreadExist) {
    const markAllBtn = createElement("button", {
      style: "background: #28a745; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.85rem; cursor: pointer;",
      events: {
        click: async () => {
          try {
            await markAllNotificationsAsRead();
            document.querySelectorAll("[data-notif-card]").forEach((el) => {
              el.style.background = "#f7f7f7";
              el.style.borderColor = "#ddd";
            });
            markAllBtn.remove();
          } catch (error) {
            console.error("Error marking all as read:", error);
          }
        },
      },
    }, ["Mark All Read"]);

    actionBarChildren.push(markAllBtn);
  }

  const clearBtn = createElement("button", {
    style: "background: #dc3545; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.85rem; cursor: pointer;",
    events: {
      click: async () => {
        if (!confirm("Clear all notifications?")) return;
        try {
          await clearAllNotifications();
          onClearAll();
        } catch (error) {
          console.error("Error clearing all notifications:", error);
        }
      },
    },
  }, ["Clear All"]);

  actionBarChildren.push(clearBtn);

  return createElement("div", {
    style: "display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid #ddd; margin-top: 1rem; justify-content: flex-end;",
  }, actionBarChildren);
}