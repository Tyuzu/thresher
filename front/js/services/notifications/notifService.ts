import { apiFetch } from "../../api/api.ts";

/**
 * Fetch all notifications for the authenticated user.
 * Normalizes backend payloads (array or object wrapper) and sorts newest first.
 */
export async function getNotifications() {
  try {
    const response = await apiFetch("/notifs");
    const rawList = Array.isArray(response)
      ? response
      : response?.notifications || response?.data || [];

    return rawList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }
}

/**
 * Mark a single notification as read by ID.
 */
export async function markNotificationAsRead(id) {
  if (!id) throw new Error("Notification ID is required.");
  
  try {
    return await apiFetch(`/notifs/notif/${id}/read`, {
      method: "PUT",
    });
  } catch (error) {
    console.error(`Failed to mark notification ${id} as read:`, error);
    throw error;
  }
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllNotificationsAsRead() {
  try {
    return await apiFetch("/notifs/read-all", {
      method: "PUT",
    });
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    throw error;
  }
}

/**
 * Delete all notifications for the current user.
 */
export async function clearAllNotifications() {
  try {
    return await apiFetch("/notifs", {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Failed to clear notifications:", error);
    throw error;
  }
}