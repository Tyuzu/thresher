import { notificationService } from '../services/notificationService.js'; // Fixed named import
import { getState } from '../state/state.js';

/**
 * Builds a clean, unified notification payload matching backend specs.
 */
export function buildNotificationPayload({
  userId,
  type = 'info',
  title = 'New notification',
  message,
  entityType = 'notify',
  entityId = '',
  relatedUser = ''
} = {}) {
  return {
    userid: userId || getState('userId') || '',
    type,
    title,
    message: message || '',
    entityType,
    entityId,
    relatedUser
  };
}

/**
 * Persists a notification payload to the backend service.
 */
export async function persistNotification(payload) {
  if (!payload?.userid || !payload?.message) {
    return null;
  }

  try {
    return await notificationService.createNotification(payload);
  } catch (error) {
    console.error('Failed to persist notification:', error);
    return null;
  }
}