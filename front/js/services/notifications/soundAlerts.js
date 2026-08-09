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

// Helper to safely obtain or instantiate the singleton AudioContext
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (typeof AudioCtor !== 'function') return null;

  if (!window.__appSoundContext) {
    window.__appSoundContext = new AudioCtor();
  }
  return window.__appSoundContext;
}

// Global user interaction handler to unlock Web Audio context on the first user gesture
if (typeof window !== 'undefined') {
  const unlockAudioContext = () => {
    const context = getAudioContext();
    if (context && context.state === 'suspended') {
      context.resume().then(() => {
        // Cleanup event listeners once successfully resumed
        ['click', 'touchstart', 'keydown'].forEach((evt) => {
          document.removeEventListener(evt, unlockAudioContext, true);
        });
      }).catch(() => {});
    }
  };

  ['click', 'touchstart', 'keydown'].forEach((evt) => {
    document.addEventListener(evt, unlockAudioContext, { capture: true, passive: true });
  });
}

function readStoredSettings() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        memorySettings = parsed;
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

  const context = getAudioContext();
  if (!context) return false;

  // If the browser hasn't registered user interaction yet, attempt a safe non-blocking resume
  if (context.state === 'suspended') {
    context.resume().catch(() => {});
    // Abort playing sound this time to prevent unhandled autoplay warning logs
    return false;
  }

  try {
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

    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };

    return true;
  } catch (err) {
    console.warn("Sound alert audio playback skipped:", err);
    return false;
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