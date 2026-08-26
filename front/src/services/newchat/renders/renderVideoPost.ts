// RenderVideoPost.ts

import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import VideoPlayer from '../../../components/ui/VideoPlayer.js';

export async function RenderVideoPost(
    mediaContainer: HTMLElement, 
    media: string[], 
    media_url: string = "", 
    resolution?: any
): Promise<void> {
    media.forEach(videoSrc => {
        const posterPath = resolveImagePath(EntityType.CHAT, PictureType.POSTER, `${media_url}.jpg`);
        const videox = VideoPlayer({
            src: videoSrc,
            className: 'post-video',
            muted: true,
            poster: posterPath,
            controls: false,
        }, media_url[0], resolution);

        mediaContainer.appendChild(videox);
    });
}