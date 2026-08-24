export function saveVideoProgress(video: HTMLVideoElement, postId: string | number): void {
  if (!postId) {
    return;
  }

  const interval = setInterval(() => {
    if (!video.paused && video.currentTime > 0) {
      localStorage.setItem(`videoProgress-${postId}`, video.currentTime.toString());
    }
  }, 5000);

  video.addEventListener("loadedmetadata", () => {
    const saved = localStorage.getItem(`videoProgress-${postId}`);
    if (saved) {
      video.currentTime = parseFloat(saved);
    }
  });

  video.addEventListener("ended", () => {
    localStorage.removeItem(`videoProgress-${postId}`);
    clearInterval(interval);
  });

  video.addEventListener("pause", () => clearInterval(interval));
}