export function setupFullscreenOrientation(
  player: HTMLElement,
  video: HTMLVideoElement
): void {
  player.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement === player) {
      if (isMobile() && video.videoWidth > video.videoHeight) {
        lockOrientation("landscape");
      }
    } else if (isMobile()) {
      unlockOrientation();
    }
  });
}

function isMobile(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function lockOrientation(orientation: OrientationLockType): void {
  if (screen.orientation?.lock) {
    screen.orientation.lock(orientation).catch(console.warn);
  }
}

function unlockOrientation(): void {
  if (screen.orientation?.unlock) {
    screen.orientation.unlock();
  }
}