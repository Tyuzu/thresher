import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resetSoundSettings,
  getSoundSettings,
  setSoundSettings,
  setChatSoundPreference,
  resolveSoundPreference
} from './soundAlerts.js';

test('defaults to enabled with separate message and notification tones', () => {
  resetSoundSettings();

  const settings = getSoundSettings();

  assert.equal(settings.enabled, true);
  assert.equal(settings.messageTone, 'default');
  assert.equal(settings.notificationTone, 'default');
});

test('per-chat overrides are resolved for message alerts', () => {
  resetSoundSettings();
  setChatSoundPreference('chat-123', { messageTone: 'sharp' });

  const preference = resolveSoundPreference({
    type: 'message',
    chatId: 'chat-123'
  });

  assert.equal(preference.tone, 'sharp');
});

test('global settings can override the default tone', () => {
  resetSoundSettings();
  setSoundSettings({ notificationTone: 'chime' });

  const preference = resolveSoundPreference({ type: 'notification' });

  assert.equal(preference.tone, 'chime');
});
