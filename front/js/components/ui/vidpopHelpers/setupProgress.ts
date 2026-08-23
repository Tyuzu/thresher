export function setupProgress(
  video: HTMLVideoElement,
  progressBar: HTMLElement,
  progressIndicator: HTMLElement
): void {
  let isDragging = false;

  const update = (): void => {
    if (!isDragging && !isNaN(video.duration) && video.duration > 0) {
      progressIndicator.style.width = `${(video.currentTime / video.duration) * 100}%`;
    }
  };

  const seek = (event: MouseEvent): void => {
    if (isNaN(video.duration) || video.duration === 0) {
      return;
    }
    const rect = progressBar.getBoundingClientRect();
    const fraction = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    video.currentTime = video.duration * fraction;
    progressIndicator.style.width = `${fraction * 100}%`;
  };

  progressBar.addEventListener("mousedown", (e: MouseEvent) => {
    isDragging = true;
    seek(e);
  });

  document.addEventListener("mousemove", (e: MouseEvent) => {
    if (isDragging) {
      seek(e);
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  video.addEventListener("timeupdate", update);
}