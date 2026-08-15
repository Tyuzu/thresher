import { apiFetch } from "../../api/api.js";

/**
 * Fetch all notifications for a given user
 */
export async function getNotifications(userId) {
  if (!userId) return [];
  try {
    const response = await apiFetch(`/notifs`);
    if (Array.isArray(response)) {
      return response.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id) {
  try {
    return await apiFetch(`/notifs/notif/${id}/read`, "PUT");
  } catch (error) {
    console.error(`Failed to mark notification ${id} as read:`, error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a given user
 */
export async function markAllNotificationsAsRead(userId) {
  if (!userId) return;
  try {
    return await apiFetch(`/notifs/read-all`, "PUT");
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    throw error;
  }
}

/**
 * Delete all notifications for a given user
 */
export async function clearAllNotifications(userId) {
  if (!userId) return;
  try {
    return await apiFetch(`/notifs`, "DELETE");
  } catch (error) {
    console.error("Failed to clear notifications:", error);
    throw error;
  }
}