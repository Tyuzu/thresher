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

// Helper to safely obtain or lazily instantiate the singleton AudioContext
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  return window.__appSoundContext || null;
}

// Global user interaction handler to create and unlock Web Audio context on the first user gesture
if (typeof window !== 'undefined') {
  const unlockAudioContext = (e) => {
    // Ignore held-down keypress repetitions to prevent event processing bottlenecks
    if (e && e.repeat) return;

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (typeof AudioCtor !== 'function') return;

    // Yield control back to main thread immediately so keydown event finishes in <1ms
    requestAnimationFrame(() => {
      try {
        if (!window.__appSoundContext) {
          window.__appSoundContext = new AudioCtor();
        }

        const context = window.__appSoundContext;

        const removeListeners = () => {
          ['click', 'touchstart', 'keydown'].forEach((evt) => {
            document.removeEventListener(evt, unlockAudioContext, { capture: true });
          });
        };

        if (context.state === 'suspended') {
          context.resume().then(removeListeners).catch(() => {});
        } else if (context.state === 'running') {
          removeListeners();
        }
      } catch {
        // Fallback for isolated security contexts
      }
    });
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
  
  // If the audio context hasn't been instantiated via user interaction yet, abort cleanly
  if (!context || context.state === 'suspended') {
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