const SOUND_KEY = 'app-sound-settings';
const CHAT_SOUND_KEY = 'app-chat-sound-settings';

const DEFAULT_SETTINGS = {
  enabled: true,
  messageEnabled: true,
  notificationEnabled: true,
  messageTone: 'default',
  notificationTone: 'default',
};

// Singleton AudioContext unlocked on first user gesture
let audioContext = null;

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audioContext = new AudioCtor();
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    ['click', 'touchstart', 'keydown'].forEach((evt) =>
      document.removeEventListener(evt, unlockAudio, true)
    );
  };

  ['click', 'touchstart', 'keydown'].forEach((evt) =>
    document.addEventListener(evt, unlockAudio, { capture: true, passive: true })
  );
}

// Storage Helpers
function getItem(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save sound settings:', e);
  }
}

// Public API
export function getSoundSettings() {
  return { ...DEFAULT_SETTINGS, ...getItem(SOUND_KEY, {}) };
}

export function setSoundSettings(partial = {}) {
  const updated = { ...getSoundSettings(), ...partial };
  setItem(SOUND_KEY, updated);
  return updated;
}

export function setChatSoundPreference(chatId, preferences = {}) {
  if (!chatId) return;
  const allChatSettings = getItem(CHAT_SOUND_KEY, {});
  allChatSettings[chatId] = { ...allChatSettings[chatId], ...preferences };
  setItem(CHAT_SOUND_KEY, allChatSettings);
  return allChatSettings;
}

export function resolveSoundPreference({ type = 'message', chatId } = {}) {
  const globalSettings = getSoundSettings();
  const chatSettings = chatId ? getItem(CHAT_SOUND_KEY, {})[chatId] || {} : {};

  const toneKey = type === 'notification' ? 'notificationTone' : 'messageTone';
  const enabledKey = type === 'notification' ? 'notificationEnabled' : 'messageEnabled';

  const enabled =
    (globalSettings.enabled ?? true) &&
    (chatSettings[enabledKey] ?? globalSettings[enabledKey] ?? true);

  const tone = chatSettings[toneKey] || globalSettings[toneKey] || 'default';

  return { enabled, tone };
}

export function resetSoundSettings() {
  try {
    localStorage.removeItem(SOUND_KEY);
    localStorage.removeItem(CHAT_SOUND_KEY);
  } catch {}
}

export function playSoundAlert({ type = 'message', chatId } = {}) {
  const { enabled, tone } = resolveSoundPreference({ type, chatId });

  if (!enabled || !audioContext || audioContext.state !== 'running') {
    return false;
  }

  try {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    const frequencies = { chime: 880, sharp: 1320, default: 660 };
    osc.frequency.value = frequencies[tone] || frequencies.default;

    gain.gain.setValueAtTime(0.04, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.3);

    return true;
  } catch {
    return false;
  }
}

export { DEFAULT_SETTINGS };