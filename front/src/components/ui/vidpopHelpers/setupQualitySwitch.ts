export interface QualityOption {
  label: string;
  src: string;
}

export function setupQualitySwitch(
  video: HTMLVideoElement,
  qualities: QualityOption[],
  selector: HTMLSelectElement | null
): void {
  if (!selector) {
    return;
  }

  selector.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const selectedLabel = target.value;
    const selectedQuality = qualities.find((q) => q.label === selectedLabel);

    if (!selectedQuality || selectedQuality.src === video.src) {
      return;
    }

    const currentTime = video.currentTime;
    const isPaused = video.paused;

    localStorage.setItem("videoQuality", selectedQuality.label);
    video.src = selectedQuality.src;
    video.setAttribute("data-quality", selectedQuality.label);

    video.addEventListener(
      "loadedmetadata",
      () => {
        video.currentTime = currentTime;
        if (!isPaused) {
          void video.play();
        }
      },
      { once: true }
    );
  });
}