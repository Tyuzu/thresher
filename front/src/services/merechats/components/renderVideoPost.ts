import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import VideoPlayer from "../../../components/ui/VideoPlayer.js";

// Interface for options passed to the VideoPlayer component
export interface VideoPlayerOptions {
  src: string;
  poster: string;
  controls?: boolean;
  muted?: boolean;
  autoplay?: boolean;
  [key: string]: unknown;
}

/**
 * Renders multiple video player elements into a specified container.
 * 
 * @param container - Target HTML container element where videos will be appended
 * @param videos - Array of video identifiers or filenames
 * @param _id - Optional identifier parameter
 * @param ext - File extension string (e.g., '.mp4')
 */
function RenderVideoPost(
  container: HTMLElement,
  videos: string[],
  _id: string = "",
  ext: string = ""
): void {
  videos.forEach((v: string) => {
    const src: string = resolveImagePath(
      EntityType.CHAT,
      PictureType.VIDEO,
      v + ext
    );

    const poster: string = resolveImagePath(
      EntityType.CHAT,
      PictureType.THUMB,
      `${v}.jpg`
    );

    const videoOptions: VideoPlayerOptions = {
      src,
      poster,
      controls: true,
      muted: true
    };

    const video = VideoPlayer(videoOptions, v) as HTMLElement;

    container.appendChild(video);
  });
}

export { RenderVideoPost };