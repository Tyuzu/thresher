import Modal from "../../components/ui/Modal.js";
import { createElement } from "../../components/createElement.js";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  NotificationItem,
} from "./notifService.js";
import * as idxDB from "../../utils/idxDB.js";

interface SystemLog {
  id?: string | number;
  notificationid?: string | number;
  type?: "info" | "error" | "success" | string;
  title?: string;
  message?: string;
  createdAt?: string | number | Date;
  isRead?: boolean;
}

/**
 * Formats a given date string/timestamp into relative human-readable time.
 */
function timeAgo(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
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
function getUserId(): string | null {
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
export async function openNotificationsModal(): Promise<void> {
  const userId = getUserId();
  let activeTab: "activity" | "system" = "activity";

  // Root wrapper layout
  const content = createElement("div", {
    style: { display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "450px", padding: "0.25rem" },
  });

  // Tab Header Navigation
  const tabHeader = createElement("div", {
    style: { display: "flex", borderBottom: "2px solid #e2e8f0", marginBottom: "0.25rem" },
  });

  const activityTabBtn = createElement("button", {
    style: { flex: "1", padding: "0.6rem", border: "none", background: "transparent", fontWeight: "600", cursor: "pointer", borderBottom: "2px solid #007bff", color: "#007bff", transition: "all 0.2s ease" },
  }, ["Activity"]);

  const systemTabBtn = createElement("button", {
    style: { flex: "1", padding: "0.6rem", border: "none", background: "transparent", fontWeight: "600", cursor: "pointer", borderBottom: "2px solid transparent", color: "#64748b", transition: "all 0.2s ease" },
  }, ["System Logs"]);

  tabHeader.appendChild(activityTabBtn);
  tabHeader.appendChild(systemTabBtn);
  content.appendChild(tabHeader);

  // Scrollable Tab Viewport
  const tabContentView = createElement("div", {
    style: { display: "flex", flexDirection: "column", gap: "0.75rem", overflowY: "auto", maxHeight: "350px", padding: "0.25rem", scrollbarWidth: "thin" },
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

  function updateTabStyles(): void {
    const isActivity = activeTab === "activity";
    activityTabBtn.style.borderBottomColor = isActivity ? "#007bff" : "transparent";
    activityTabBtn.style.color = isActivity ? "#007bff" : "#64748b";
    systemTabBtn.style.borderBottomColor = !isActivity ? "#007bff" : "transparent";
    systemTabBtn.style.color = !isActivity ? "#007bff" : "#64748b";
  }

  // --- Renderers ---

  async function renderActivityTab(): Promise<void> {
    tabContentView.innerHTML = `<div style="text-align: center; color: #64748b; padding: 2.5rem 0;">Loading activity...</div>`;
    
    try {
      const notifications = (await getNotifications()) || [];
      tabContentView.innerHTML = "";

      if (!notifications.length) {
        renderEmptyState(tabContentView, "No activity updates yet.");
        return;
      }

      const listContainer = createElement("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" } });
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

  async function renderSystemTab(): Promise<void> {
    tabContentView.innerHTML = `<div style="text-align: center; color: #64748b; padding: 2.5rem 0;">Loading system logs...</div>`;
    
    let logs: SystemLog[] = [];
    try {
      logs = (await idxDB.getAll()) || [];
      logs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (err) {
      console.error("Failed to fetch system logs from IndexedDB:", err);
    }

    tabContentView.innerHTML = "";

    if (!logs.length) {
      renderEmptyState(tabContentView, "No system logs or error reports found.");
      return;
    }

    const listContainer = createElement("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" } });
    logs.forEach((log) => {
      listContainer.appendChild(createSystemLogCard(log, renderSystemTab));
    });
    tabContentView.appendChild(listContainer);

    const actionBar = createSystemActionBar(logs, renderSystemTab);
    if (actionBar) tabContentView.appendChild(actionBar);
  }

  renderActivityTab();
}

/**
 * Reusable Empty State Visual Element
 */
function renderEmptyState(container: HTMLElement, message: string): void {
  container.appendChild(
    createElement("div", { style: { textAlign: "center", color: "#64748b", padding: "2.5rem 1rem" } }, [
      createElement("p", { style: { fontWeight: "600", fontSize: "1rem", marginBottom: "0.25rem", color: "#334155" } }, ["🔔 All caught up"]),
      createElement("p", { style: { fontSize: "0.85rem", color: "#94a3b8", margin: "0" } }, [message]),
    ])
  );
}

/**
 * Card Component: User Activity Notification
 */
function createNotificationCard(n: NotificationItem, userId: string | null, onChange?: () => void): HTMLElement {
  let isRead = Boolean(n.isRead);

  const leftContent = createElement("div", { style: { flex: "1", minWidth: "0" } }, [
    createElement("strong", {
      style: { display: "block", marginBottom: "0.25rem", fontSize: "0.925rem", color: isRead ? "#475569" : "#0f172a" },
    }, [n.title || n.type || "Notification"]),
    createElement("p", {
      style: { margin: "0", fontSize: "0.85rem", color: "#64748b", display: "-webkit-box", WebkitLineClamp: "2", WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.4" },
    }, [n.message || "No details provided."]),
    createElement("small", {
      style: { color: "#94a3b8", fontSize: "0.775rem", display: "block", marginTop: "0.35rem" },
    }, [timeAgo(n.createdAt || Date.now())]),
  ]);

  const markReadBtn = createElement("button", {
    style: { background: "#007bff", color: "#ffffff", border: "none", padding: "0.35rem 0.75rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "500", cursor: "pointer", whiteSpace: "nowrap", transition: "opacity 0.2s" },
    events: {
      click: async (e: Event) => {
        const mouseEvent = e as MouseEvent;
        mouseEvent.stopPropagation();
        const notifId = n.notificationid || n.id;
        
        isRead = true;
        card.style.background = "#f8fafc";
        card.style.borderColor = "#e2e8f0";
        markReadBtn.style.display = "none";

        try {
          await markNotificationAsRead(notifId);
          if (onChange) onChange();
        } catch (err) {
          console.error("Failed to mark notification read:", err);
          isRead = false;
          card.style.background = "#f0f9ff";
          card.style.borderColor = "#bae6fd";
          markReadBtn.style.display = "inline-block";
        }
      },
    },
  }, ["Mark Read"]);

  const children: HTMLElement[] = [leftContent];
  if (!isRead && userId) children.push(markReadBtn);

  const card = createElement("div", {
    dataset: { notifCard: "true" },
    style: { padding: "0.75rem 1rem", borderRadius: "6px", background: isRead ? "#f8fafc" : "#f0f9ff", border: `1px solid ${isRead ? "#e2e8f0" : "#bae6fd"}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", transition: "all 0.2s ease" },
  }, children);

  return card;
}

/**
 * Card Component: IndexedDB System Log
 */
function createSystemLogCard(log: SystemLog, onChange?: () => void): HTMLElement {
  let isRead = Boolean(log.isRead);
  const isError = log.type === "error";
  const isSuccess = log.type === "success";

  const getThemeStyles = (readState: boolean) => {
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
    style: { background: currentStyles.badgeBg, color: "#ffffff", padding: "0.15rem 0.45rem", borderRadius: "3px", fontSize: "0.675rem", fontWeight: "700", textTransform: "uppercase", display: "inline-block", marginBottom: "0.35rem", letterSpacing: "0.025em" },
  }, [log.type || "info"]);

  const content = createElement("div", { style: { flex: "1", minWidth: "0" } }, [
    badge,
    createElement("strong", {
      style: { display: "block", marginBottom: "0.25rem", fontSize: "0.9rem", color: isRead ? "#475569" : "#0f172a" },
    }, [log.title || "System Message"]),
    createElement("p", {
      style: { margin: "0", fontSize: "0.85rem", color: "#334155", wordBreak: "break-word", lineHeight: "1.4" },
    }, [log.message || ""]),
    createElement("small", {
      style: { color: "#94a3b8", fontSize: "0.75rem", display: "block", marginTop: "0.35rem" },
    }, [timeAgo(log.createdAt || Date.now())]),
  ]);

  const markReadBtn = createElement("button", {
    style: { background: "#007bff", color: "#ffffff", border: "none", padding: "0.35rem 0.75rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "500", cursor: "pointer", whiteSpace: "nowrap", alignSelf: "center", transition: "opacity 0.2s" },
    events: {
      click: async (e: Event) => {
        const mouseEvent = e as MouseEvent;
        mouseEvent.stopPropagation();
        try {
          const updatedLog = { ...log, isRead: true };
          const saveMethod = (idxDB as any).update || (idxDB as any).put;
          
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

  const children: HTMLElement[] = [content];
  if (!isRead) children.push(markReadBtn);

  const card = createElement("div", {
    style: { padding: "0.75rem 1rem", borderRadius: "6px", background: currentStyles.bgColor, border: `1px solid ${currentStyles.borderColor}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", transition: "all 0.2s ease" },
  }, children);

  return card;
}

/**
 * System Logs Action Footer
 */
function createSystemActionBar(logs: SystemLog[], onRefresh: () => void): HTMLElement | null {
  if (!logs.length) return null;

  const actionBarChildren: HTMLElement[] = [];
  const unreadExist = logs.some((log) => !log.isRead);

  if (unreadExist) {
    const markAllBtn = createElement("button", {
      style: { background: "#16a34a", color: "#ffffff", border: "none", padding: "0.4rem 0.85rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "500", cursor: "pointer", transition: "opacity 0.2s" },
      events: {
        click: async () => {
          try {
            const saveMethod = (idxDB as any).update || (idxDB as any).put;
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
    style: { background: "#dc2626", color: "#ffffff", border: "none", padding: "0.4rem 0.85rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "500", cursor: "pointer", transition: "opacity 0.2s" },
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
    style: { display: "flex", gap: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0", marginTop: "0.5rem", justifyContent: "flex-end" },
  }, actionBarChildren);
}

/**
 * Activity Tab Action Footer
 */
function createActionBar(userId: string | null, notifications: NotificationItem[], onRefresh: () => void): HTMLElement | null {
  if (!userId || !notifications.length) return null;

  const actionBarChildren: HTMLElement[] = [];
  const unreadExist = notifications.some((n) => !n.isRead);

  if (unreadExist) {
    const markAllBtn = createElement("button", {
      style: { background: "#16a34a", color: "#ffffff", border: "none", padding: "0.4rem 0.85rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "500", cursor: "pointer", transition: "opacity 0.2s" },
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
    style: { background: "#dc2626", color: "#ffffff", border: "none", padding: "0.4rem 0.85rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "500", cursor: "pointer", transition: "opacity 0.2s" },
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
    style: { display: "flex", gap: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0", marginTop: "0.5rem", justifyContent: "flex-end" },
  }, actionBarChildren);
}