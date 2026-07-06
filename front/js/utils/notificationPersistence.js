import notificationService from '../services/notificationService.js';
import { getState } from '../state/state.js';

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

export async function persistNotification(payload) {
  if (!payload?.userid || !payload?.message) {
    return null;
  }

  try {
    return await notificationService.createNotification(payload);
  } catch (error) {
    console.error('Failed to persist notification', error);
    return null;
  }
}
