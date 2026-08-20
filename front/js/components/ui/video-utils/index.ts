import { setupHotkeys } from "./hotkeys.ts";
import { setupGestures } from "./gestureHandlers.ts";
import { saveVideoProgress } from "./progressSaver.ts";

export function setupVideoUtilityFunctions(video, videoid) {
  setupGestures(video);
  setupHotkeys(video);

  if (videoid) {
    saveVideoProgress(video, videoid);
  }

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    (video.parentElement || document.body).classList.add("dark-mode");
  }
}
