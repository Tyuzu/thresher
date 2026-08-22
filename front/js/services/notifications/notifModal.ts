import Modal from "../../components/ui/Modal.js";
import { createElement } from "../../components/createElement.js";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
} from "./notifService.js";
import * as idxDB from "../../utils/idxDB.js";

/**
 * Formats a given date string/timestamp into relative human-readable time.
 */
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

/**
 * Safely retrieves user ID from localStorage.
 */
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

/**
 * Main Modal Entry Point
 */
export async function openNotificationsModal() {
  const userId = getUserId();
  let activeTab = "activity"; // Active state tracking: 'activity' | 'system'

  // Root wrapper layout
  const content = createElement("div", {
    style: "display: flex; flex-direction: column; gap: 0.75rem; max-height: 450px; padding: 0.25rem;",
  });

  // Tab Header Navigation
  const tabHeader = createElement("div", {
    style: "display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 0.25rem;",
  });

  const activityTabBtn = createElement("button", {
    style: "flex: 1; padding: 0.6rem; border: none; background: transparent; font-weight: 600; cursor: pointer; border-bottom: 2px solid #007bff; color: #007bff; transition: all 0.2s ease;",
  }, ["Activity"]);

  const systemTabBtn = createElement("button", {
    style: "flex: 1; padding: 0.6rem; border: none; background: transparent; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; color: #64748b; transition: all 0.2s ease;",
  }, ["System Logs"]);

  tabHeader.appendChild(activityTabBtn);
  tabHeader.appendChild(systemTabBtn);
  content.appendChild(tabHeader);

  // Scrollable Tab Viewport
  const tabContentView = createElement("div", {
    style: "display: flex; flex-direction: column; gap: 0.75rem; overflow-y: auto; max-height: 350px; padding: 0.25rem; scrollbar-width: thin;",
  });
  content.appendChild(tabContentView);

  // Mount the main UI container inside the Modal Shell
  Modal({
    title: "📬 Notifications & Logs",
    content: content,
    size: "medium",
    showCloseButton: true,
  });

  // Tab Switching Actions
  activityTabBtn.addEventListener("click", () => {
    if (activeTab === "activity") return;
    activeTab = "activity";
    updateTabStyles();
    renderActivityTab();
  });

  systemTabBtn.addEventListener("click", () => {
    if (activeTab === "system") return;
    activeTab = "system";
    updateTabStyles();
    renderSystemTab();
  });

  function updateTabStyles() {
    const isActivity = activeTab === "activity";
    activityTabBtn.style.borderBottomColor = isActivity ? "#007bff" : "transparent";
    activityTabBtn.style.color = isActivity ? "#007bff" : "#64748b";
    systemTabBtn.style.borderBottomColor = !isActivity ? "#007bff" : "transparent";
    systemTabBtn.style.color = !isActivity ? "#007bff" : "#64748b";
  }

  // --- Renderers ---

  async function renderActivityTab() {
    tabContentView.innerHTML = `<div style="text-align: center; color: #64748b; padding: 2.5rem 0;">Loading activity...</div>`;
    
    try {
      const notifications = (await getNotifications()) || [];
      tabContentView.innerHTML = "";

      if (!notifications.length) {
        renderEmptyState(tabContentView, "No activity updates yet.");
        return;
      }

      const listContainer = createElement("div", { style: "display: flex; flex-direction: column; gap: 0.75rem;" });
      notifications.forEach((notification) => {
        listContainer.appendChild(createNotificationCard(notification, userId, renderActivityTab));
      });
      tabContentView.appendChild(listContainer);

      const actionBar = createActionBar(userId, notifications, renderActivityTab);
      if (actionBar) tabContentView.appendChild(actionBar);
    } catch (err) {
      console.error("Failed to load activity notifications:", err);
      tabContentView.innerHTML = `<div style="text-align: center; color: #dc3545; padding: 2rem;">Failed to load activity notifications.</div>`;
    }
  }

  async function renderSystemTab() {
    tabContentView.innerHTML = `<div style="text-align: center; color: #64748b; padding: 2.5rem 0;">Loading system logs...</div>`;
    
    let logs = [];
    try {
      logs = (await idxDB.getAll()) || [];
      // Sort newest entries to top
      logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.error("Failed to fetch system logs from IndexedDB:", err);
    }

    tabContentView.innerHTML = "";

    if (!logs.length) {
      renderEmptyState(tabContentView, "No system logs or error reports found.");
      return;
    }

    const listContainer = createElement("div", { style: "display: flex; flex-direction: column; gap: 0.75rem;" });
    logs.forEach((log) => {
      listContainer.appendChild(createSystemLogCard(log, renderSystemTab));
    });
    tabContentView.appendChild(listContainer);

    const actionBar = createSystemActionBar(logs, renderSystemTab);
    if (actionBar) tabContentView.appendChild(actionBar);
  }

  // Initial load default view
  renderActivityTab();
}

/**
 * Reusable Empty State Visual Element
 */
function renderEmptyState(container, message) {
  container.appendChild(
    createElement("div", { style: "text-align: center; color: #64748b; padding: 2.5rem 1rem;" }, [
      createElement("p", { style: "font-weight: 600; font-size: 1rem; margin-bottom: 0.25rem; color: #334155;" }, ["🔔 All caught up"]),
      createElement("p", { style: "font-size: 0.85rem; color: #94a3b8; margin: 0;" }, [message]),
    ])
  );
}

/**
 * Card Component: User Activity Notification
 */
function createNotificationCard(n, userId, onChange) {
  let isRead = Boolean(n.isRead);

  const leftContent = createElement("div", { style: "flex: 1; min-width: 0;" }, [
    createElement("strong", {
      style: `display: block; margin-bottom: 0.25rem; font-size: 0.925rem; color: ${isRead ? "#475569" : "#0f172a"};`,
    }, [n.title || n.type || "Notification"]),
    createElement("p", {
      style: "margin: 0; font-size: 0.85rem; color: #64748b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;",
    }, [n.message || "No details provided."]),
    createElement("small", {
      style: "color: #94a3b8; font-size: 0.775rem; display: block; margin-top: 0.35rem;",
    }, [timeAgo(n.createdAt)]),
  ]);

  const markReadBtn = createElement("button", {
    style: "background: #007bff; color: #ffffff; border: none; padding: 0.35rem 0.75rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; cursor: pointer; white-space: nowrap; transition: opacity 0.2s;",
    events: {
      click: async (e) => {
        e.stopPropagation();
        const notifId = n.notificationid || n.id;
        
        // Optimistic UI updates
        isRead = true;
        card.style.background = "#f8fafc";
        card.style.borderColor = "#e2e8f0";
        markReadBtn.style.display = "none";

        try {
          await markNotificationAsRead(notifId);
          if (onChange) onChange();
        } catch (err) {
          console.error("Failed to mark notification read:", err);
          // Rollback UI changes on failure
          isRead = false;
          card.style.background = "#f0f9ff";
          card.style.borderColor = "#bae6fd";
          markReadBtn.style.display = "inline-block";
        }
      },
    },
  }, ["Mark Read"]);

  const children = [leftContent];
  if (!isRead && userId) children.push(markReadBtn);

  const card = createElement("div", {
    "data-notif-card": "true",
    style: `padding: 0.75rem 1rem; border-radius: 6px; background: ${isRead ? "#f8fafc" : "#f0f9ff"}; border: 1px solid ${isRead ? "#e2e8f0" : "#bae6fd"}; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; transition: all 0.2s ease;`,
  }, children);

  return card;
}

/**
 * Card Component: IndexedDB System Log
 */
function createSystemLogCard(log, onChange) {
  let isRead = Boolean(log.isRead);
  const isError = log.type === "error";
  const isSuccess = log.type === "success";

  const getThemeStyles = (readState) => {
    let bgColor = readState ? "#f8fafc" : "#f0f9ff";
    let borderColor = readState ? "#e2e8f0" : "#bae6fd";
    let badgeBg = "#64748b";

    if (isError) {
      bgColor = readState ? "#fef2f2" : "#fff1f1";
      borderColor = readState ? "#fecaca" : "#fda4af";
      badgeBg = "#dc2626";
    } else if (isSuccess) {
      bgColor = readState ? "#f0fdf4" : "#ecfdf5";
      borderColor = readState ? "#bbf7d0" : "#a7f3d0";
      badgeBg = "#16a34a";
    }

    return { bgColor, borderColor, badgeBg };
  };

  let currentStyles = getThemeStyles(isRead);

  const badge = createElement("span", {
    style: `background: ${currentStyles.badgeBg}; color: #ffffff; padding: 0.15rem 0.45rem; border-radius: 3px; font-size: 0.675rem; font-weight: 700; text-transform: uppercase; display: inline-block; margin-bottom: 0.35rem; letter-spacing: 0.025em;`,
  }, [log.type || "info"]);

  const content = createElement("div", { style: "flex: 1; min-width: 0;" }, [
    badge,
    createElement("strong", {
      style: `display: block; margin-bottom: 0.25rem; font-size: 0.9rem; color: ${isRead ? "#475569" : "#0f172a"};`,
    }, [log.title || "System Message"]),
    createElement("p", {
      style: "margin: 0; font-size: 0.85rem; color: #334155; word-break: break-word; line-height: 1.4;",
    }, [log.message || ""]),
    createElement("small", {
      style: "color: #94a3b8; font-size: 0.75rem; display: block; margin-top: 0.35rem;",
    }, [timeAgo(log.createdAt)]),
  ]);

  const markReadBtn = createElement("button", {
    style: "background: #007bff; color: #ffffff; border: none; padding: 0.35rem 0.75rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; cursor: pointer; white-space: nowrap; align-self: center; transition: opacity 0.2s;",
    events: {
      click: async (e) => {
        e.stopPropagation();
        try {
          const updatedLog = { ...log, isRead: true };
          const saveMethod = idxDB.update || idxDB.put;
          
          if (saveMethod) {
            await saveMethod(updatedLog);
          }
          
          isRead = true;
          const newStyles = getThemeStyles(true);
          card.style.background = newStyles.bgColor;
          card.style.borderColor = newStyles.borderColor;
          markReadBtn.style.display = "none";

          if (onChange) onChange();
        } catch (err) {
          console.error("Failed to update log state in IndexedDB:", err);
        }
      },
    },
  }, ["Mark Read"]);

  const children = [content];
  if (!isRead) children.push(markReadBtn);

  const card = createElement("div", {
    style: `padding: 0.75rem 1rem; border-radius: 6px; background: ${currentStyles.bgColor}; border: 1px solid ${currentStyles.borderColor}; display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; transition: all 0.2s ease;`,
  }, children);

  return card;
}

/**
 * System Logs Action Footer
 */
function createSystemActionBar(logs, onRefresh) {
  if (!logs.length) return null;

  const actionBarChildren = [];
  const unreadExist = logs.some((log) => !log.isRead);

  if (unreadExist) {
    const markAllBtn = createElement("button", {
      style: "background: #16a34a; color: #ffffff; border: none; padding: 0.4rem 0.85rem; border-radius: 4px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: opacity 0.2s;",
      events: {
        click: async () => {
          try {
            const saveMethod = idxDB.update || idxDB.put;
            const updatePromises = logs
              .filter((log) => !log.isRead)
              .map((log) => saveMethod({ ...log, isRead: true }));

            await Promise.all(updatePromises);
            onRefresh();
          } catch (error) {
            console.error("Error batch updating logs in IndexedDB:", error);
          }
        },
      },
    }, ["Mark All Read"]);

    actionBarChildren.push(markAllBtn);
  }

  const clearLogsBtn = createElement("button", {
    style: "background: #dc2626; color: #ffffff; border: none; padding: 0.4rem 0.85rem; border-radius: 4px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: opacity 0.2s;",
    events: {
      click: async () => {
        if (!confirm("Clear all stored system logs?")) return;
        try {
          await idxDB.clear();
          onRefresh();
        } catch (error) {
          console.error("Error clearing IndexedDB logs:", error);
        }
      },
    },
  }, ["Clear All Logs"]);

  actionBarChildren.push(clearLogsBtn);

  return createElement("div", {
    style: "display: flex; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; margin-top: 0.5rem; justify-content: flex-end;",
  }, actionBarChildren);
}

/**
 * Activity Tab Action Footer
 */
function createActionBar(userId, notifications, onRefresh) {
  if (!userId || !notifications.length) return null;

  const actionBarChildren = [];
  const unreadExist = notifications.some((n) => !n.isRead);

  if (unreadExist) {
    const markAllBtn = createElement("button", {
      style: "background: #16a34a; color: #ffffff; border: none; padding: 0.4rem 0.85rem; border-radius: 4px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: opacity 0.2s;",
      events: {
        click: async () => {
          try {
            await markAllNotificationsAsRead();
            onRefresh();
          } catch (error) {
            console.error("Error marking all notifications as read:", error);
          }
        },
      },
    }, ["Mark All Read"]);

    actionBarChildren.push(markAllBtn);
  }

  const clearBtn = createElement("button", {
    style: "background: #dc2626; color: #ffffff; border: none; padding: 0.4rem 0.85rem; border-radius: 4px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: opacity 0.2s;",
    events: {
      click: async () => {
        if (!confirm("Clear all activity notifications?")) return;
        try {
          await clearAllNotifications();
          onRefresh();
        } catch (error) {
          console.error("Error clearing activity notifications:", error);
        }
      },
    },
  }, ["Clear All"]);

  actionBarChildren.push(clearBtn);

  return createElement("div", {
    style: "display: flex; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; margin-top: 0.5rem; justify-content: flex-end;",
  }, actionBarChildren);
}