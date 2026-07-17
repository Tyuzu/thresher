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
      if (raw) {
        const parsed = JSON.parse(raw);
        memorySettings = parsed; // Sync memory cache on successful reads
        return parsed;
      }
    } catch {
      return memorySettings;
    }
  }
  return memorySettings || DEFAULT_SETTINGS;
}

function readStoredChatSettings() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(SOUND_CHAT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryChatSettings = parsed;
        return parsed;
      }
    } catch {
      return memoryChatSettings;
    }
  }
  return memoryChatSettings;
}

function writeStoredSettings(settings) {
  memorySettings = settings;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("Storage write failed, falling back safely to isolation memory:", e);
    }
  }
}

function writeStoredChatSettings(settings) {
  memoryChatSettings = settings;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SOUND_CHAT_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("Chat storage write failed, falling back safely to isolation memory:", e);
    }
  }
}

function mergeSettings(partial = {}) {
  const currentGlobal = readStoredSettings();
  return {
    ...DEFAULT_SETTINGS,
    ...currentGlobal,
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
  if (!chatId) return;

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
  
  // Enforce hierarchical structural precedence rules:
  // 1. Global Master Switch OFF overrides all targets.
  // 2. Chat-specific setting override takes next precedence if available.
  // 3. Channel-specific global setting takes last priority fallback.
  let isEnabled = settings.enabled ?? true;
  if (isEnabled) {
    isEnabled = chatSettings[enabledKey] ?? settings[enabledKey] ?? true;
  }

  return {
    enabled: isEnabled,
    tone: resolvedTone
  };
}

function resetSoundSettings() {
  memorySettings = null;
  memoryChatSettings = {};

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(SOUND_STORAGE_KEY);
      window.localStorage.removeItem(SOUND_CHAT_STORAGE_KEY);
    } catch (e) {
      // Catch isolation context security sandboxing flags safely
    }
  }
}

export function playSoundAlert({ type = 'message', chatId } = {}) {
  const preference = resolveSoundPreference({ type, chatId });

  if (!preference.enabled || typeof window === 'undefined') {
    return false;
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (typeof AudioCtor !== 'function') {
    return false;
  }

  // Handle global execution singleton context layer securely
  if (!window.__appSoundContext) {
    window.__appSoundContext = new AudioCtor();
  }
  const context = window.__appSoundContext;

  // Unlocking explicit browser window threads safely
  if (context.state === 'suspended') {
    context.resume();
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = preference.tone === 'chime' ? 880 : preference.tone === 'sharp' ? 1320 : 660;
  
  gainNode.gain.setValueAtTime(0.04, context.currentTime);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
  oscillator.stop(context.currentTime + 0.3);

  // Explicitly clear structural references on stream completion to prevent memory leaks
  oscillator.onended = () => {
    oscillator.disconnect();
    gainNode.disconnect();
  };

  return true;
}

export {
  DEFAULT_SETTINGS,
  getSoundSettings,
  setSoundSettings,
  setChatSoundPreference,
  resolveSoundPreference,
  resetSoundSettings
};