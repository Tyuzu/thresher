// Local mock database state
let mockNotifications = [
  {
    id: "notif-1",
    notificationid: "notif-1",
    title: "New Security Alert",
    message: "A new login attempt was detected from Chrome on macOS.",
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
  },
  {
    id: "notif-2",
    notificationid: "notif-2",
    title: "Task Assigned",
    message: "Alex assigned you to 'Refactor Navigation Component'.",
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: "notif-3",
    notificationid: "notif-3",
    title: "Subscription Renewal",
    message: "Your monthly Pro Plan will auto-renew in 3 days.",
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    id: "notif-4",
    notificationid: "notif-4",
    title: "Welcome to the Platform!",
    message: "Thanks for joining. Check out our quick-start guide to get up to speed.",
    isRead: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  },
];

// Helper to simulate API response delay
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch all notifications for a given user
 */
export async function getNotifications(userId) {
  await delay();
  if (!userId) return [];

  // Sort descending by date
  return [...mockNotifications].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id) {
  await delay();
  mockNotifications = mockNotifications.map((notif) => {
    if (notif.id === id || notif.notificationid === id) {
      return { ...notif, isRead: true };
    }
    return notif;
  });
  return { success: true, id };
}

/**
 * Mark all notifications as read for a given user
 */
export async function markAllNotificationsAsRead(userId) {
  await delay();
  if (!userId) return;

  mockNotifications = mockNotifications.map((notif) => ({
    ...notif,
    isRead: true,
  }));
  return { success: true };
}

/**
 * Delete all notifications for a given user
 */
export async function clearAllNotifications(userId) {
  await delay();
  if (!userId) return;

  mockNotifications = [];
  return { success: true };
}