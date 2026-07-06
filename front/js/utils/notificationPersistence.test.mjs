import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationPayload } from './notificationPersistence.js';

test('builds a notification payload with defaults for toast persistence', () => {
  const payload = buildNotificationPayload({
    userId: 'user-123',
    type: 'success',
    message: 'Saved successfully'
  });

  assert.deepEqual(payload, {
    userid: 'user-123',
    type: 'success',
    title: 'New notification',
    message: 'Saved successfully',
    entityType: 'notify',
    entityId: '',
    relatedUser: ''
  });
});
