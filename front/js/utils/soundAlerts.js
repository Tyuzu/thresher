const SOUND_STORAGE_KEY = 'app-sound-settings';
const SOUND_CHAT_STORAGE_KEY = 'app-chat-sound-settings';

const DEFAULT_TONES = {
  message: 'default',
  notification: 'default'
};

const DEFAULT_SETTINGS = {
  enabled: true,
  messageEnabled: true,
  notificationEnabled: true,
  messageTone: DEFAULT_TONES.message,
  notificationTone: DEFAULT_TONES.notification
};

let memorySettings = null;
let memoryChatSettings = {};

function readStoredSettings() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return memorySettings;
    }
  }

  return memorySettings;
}

function readStoredChatSettings() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(SOUND_CHAT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return memoryChatSettings;
    }
  }

  return memoryChatSettings;
}

function writeStoredSettings(settings) {
  memorySettings = settings;

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(settings));
  }
}

function writeStoredChatSettings(settings) {
  memoryChatSettings = settings;

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(SOUND_CHAT_STORAGE_KEY, JSON.stringify(settings));
  }
}

function mergeSettings(partial = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...(readStoredSettings() || {}),
    ...partial
  };
}

function getSoundSettings() {
  return mergeSettings();
}

function setSoundSettings(partial = {}) {
  const next = mergeSettings(partial);
  writeStoredSettings(next);
  return next;
}

function setChatSoundPreference(chatId, preferences = {}) {
  if (!chatId) {
    return;
  }

  const current = readStoredChatSettings();
  const next = {
    ...current,
    [chatId]: {
      ...(current[chatId] || {}),
      ...preferences
    }
  };

  writeStoredChatSettings(next);
  return next;
}

function resolveSoundPreference({ type = 'message', chatId } = {}) {
  const settings = getSoundSettings();
  const chatSettings = chatId ? readStoredChatSettings()[chatId] || {} : {};
  const toneKey = type === 'notification' ? 'notificationTone' : 'messageTone';
  const enabledKey = type === 'notification' ? 'notificationEnabled' : 'messageEnabled';
  const resolvedTone = chatSettings[toneKey] || settings[toneKey] || DEFAULT_TONES[type] || 'default';
  const isEnabled = chatSettings[enabledKey] ?? settings[enabledKey] ?? settings.enabled ?? true;

  return {
    enabled: isEnabled,
    tone: resolvedTone
  };
}

function resetSoundSettings() {
  memorySettings = null;
  memoryChatSettings = {};

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(SOUND_STORAGE_KEY);
    window.localStorage.removeItem(SOUND_CHAT_STORAGE_KEY);
  }
}

export {
  DEFAULT_SETTINGS,
  getSoundSettings,
  setSoundSettings,
  setChatSoundPreference,
  resolveSoundPreference,
  resetSoundSettings
};

export function playSoundAlert({ type = 'message', chatId } = {}) {
  const preference = resolveSoundPreference({ type, chatId });

  if (!preference.enabled) {
    return false;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (typeof AudioCtor !== 'function') {
    return false;
  }

  const context = typeof window.__appSoundContext !== 'undefined'
    ? window.__appSoundContext
    : new AudioCtor();

  if (!context || typeof context.createOscillator !== 'function') {
    return false;
  }

  if (typeof window.__appSoundContext === 'undefined') {
    window.__appSoundContext = context;
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = preference.tone === 'chime' ? 880 : preference.tone === 'sharp' ? 1320 : 660;
  gainNode.gain.value = 0.04;

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
  oscillator.stop(context.currentTime + 0.3);

  return true;
}
