// RenderAudioPost.ts

import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import AudioPlayer, { LyricLine } from "../../../components/ui/AudioPlayer.js";

export async function RenderAudioPost(
    mediaContainer: HTMLElement, 
    media_url: string = "", 
    resolution?: any
): Promise<void> {
    const audioSrc = resolveImagePath(EntityType.CHAT, PictureType.AUDIO, `${media_url}.mp3`);
    const posterPath = resolveImagePath(EntityType.CHAT, PictureType.THUMB, `${media_url}.jpg`);

    const audiox = AudioPlayer({
        src: audioSrc,
        className: 'post-audio',
        muted: false,
        poster: posterPath,
        controls: true,
        resolutions: resolution,
    });

    mediaContainer.appendChild(audiox);
}