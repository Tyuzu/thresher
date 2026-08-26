import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import AudioPlayer from "../../../components/ui/AudioPlayer.js";

interface RenderAudioPostOptions {
  resolution?: string | number;
  lyrics?: unknown;
}

export async function RenderAudioPost(
  container: HTMLElement,
  id: string = "",
  options: RenderAudioPostOptions = {}
): Promise<void> {
  const { resolution, lyrics } = options;

  const src = resolveImagePath(EntityType.CHAT, PictureType.AUDIO, `${id}.mp3`);
  const poster = resolveImagePath(EntityType.CHAT, PictureType.THUMB, `${id}.jpg`);

  const audio = AudioPlayer({
    src,
    poster,
    controls: true,
    muted: false,
    className: 'post-audio',
    lyricsData: Array.isArray(lyrics) ? (lyrics as any[]) : [],
    resolutions: resolution
  });

  container.appendChild(audio);
}