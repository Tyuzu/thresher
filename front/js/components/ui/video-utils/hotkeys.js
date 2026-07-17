import {
  changeZoom,
  flipVideo,
  rotateVideo,
  resetRotation,
  updateTransform
} from "./gestureHandlers.js";
import {
  setVolume,
  toggleMute,
  resetSpeed,
  slower,
  faster
} from "./volumeSpeedControls.js";
import {
  togglePictureInPicture,
  toggleFullScreen,
  subtitles
} from "../vidpopHelpers/vutils.js";

export function setupHotkeys(video) {
  const isInput = (el) => ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;

  const actions = {
    "h": () => flipVideo(video),
    "+": () => changeZoom(-1, null, video),
    "=": () => changeZoom(-1, null, video), // Fallback map for un-shifted zoom keys
    "-": () => changeZoom(1, null, video),
    "c": () => faster(video),
    "x": () => resetSpeed(video),
    "z": () => slower(video),
    "b": () => setVolume(video, -0.1),
    "n": () => setVolume(video, 0.1),
    "m": () => toggleMute(video),
    "v": () => video.paused ? video.play() : video.pause(),
    " ": () => video.paused ? video.play() : video.pause(), // Universal Spacebar play/pause
    ",": () => video.currentTime = Math.max(0, video.currentTime - 1 / 12),
    ".": () => video.currentTime = Math.min(video.duration, video.currentTime + 1 / 12),
    "f": () => toggleFullScreen(video),
    "k": () => video.paused ? video.play() : video.pause(),
    "j": () => video.currentTime = Math.max(0, video.currentTime - 10),
    "l": () => video.currentTime = Math.min(video.duration, video.currentTime + 10),
    "r": () => rotateVideo(video),
    "alt+r": () => resetRotation(video),
    "shift+arrowup": () => setVolume(video, 0.1),
    "shift+arrowdown": () => setVolume(video, -0.1),
    "ctrl+arrowleft": () => video.currentTime -= 5,
    "ctrl+arrowright": () => video.currentTime += 5,
    "s": () => subtitles(video),
    "p": () => togglePictureInPicture(video),
  };

  // Set up 0-9 timeline progress mapping
  for (let i = 0; i <= 9; i++) {
    actions[String(i)] = () => {
      if (!isNaN(video.duration)) {
        video.currentTime = video.duration * (i / 10);
      }
    };
  }

  const handleKeyDown = async (e) => {
    if (isInput(e.target)) return;

    // Build combo string using lowercase variants exclusively to avoid matching conflicts
    const modifiers = [];
    if (e.ctrlKey || e.metaKey) modifiers.push("ctrl"); // Map Meta (Cmd on Mac) to Ctrl cleanly
    if (e.shiftKey) modifiers.push("shift");
    if (e.altKey) modifiers.push("alt");

    const baseKey = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
    
    // Fallback array checks strings against full modifier chains or structural codes
    const combo = modifiers.length ? [...modifiers, baseKey].join("+") : baseKey;
    const arrowCombo = modifiers.length ? [...modifiers, e.code.toLowerCase()].join("+") : e.code.toLowerCase();

    // Resolve key maps via structural string configurations
    const action = actions[combo] || actions[arrowCombo] || actions[baseKey];

    if (action) {
      e.preventDefault();
      e.stopPropagation(); // Restrict shortcut updates inside nested component loops
      
      await action();
      
      // Update transformations except for simple media toggles
      if (!["m", "v", " "].includes(baseKey)) {
        updateTransform(video);
      }
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  // Return a cleanup callback to destroy listeners when components unmount
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}