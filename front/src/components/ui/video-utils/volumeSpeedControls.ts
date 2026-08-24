export const setVolume = (video: HTMLVideoElement, val: number): void => {
  video.volume = Math.max(0, Math.min(1, video.volume + val));
};

export const toggleMute = (video: HTMLVideoElement): void => {
  video.muted = !video.muted;
};

export const resetSpeed = (video: HTMLVideoElement): void => {
  video.playbackRate = 1;
};

export const slower = (video: HTMLVideoElement): void => {
  video.playbackRate = Math.max(0.25, video.playbackRate - 0.15);
};

export const faster = (video: HTMLVideoElement): void => {
  video.playbackRate = Math.min(3, video.playbackRate + 0.15);
};