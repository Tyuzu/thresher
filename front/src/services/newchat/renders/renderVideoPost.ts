// RenderVideoPost.ts

import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import VideoPlayer from '../../../components/ui/VideoPlayer.js';

export async function RenderVideoPost(
    mediaContainer: HTMLElement,
    media: string[],
    media_url: string | { controls?: boolean; "aria-label"?: string } = "",
    resolution?: unknown
): Promise<void> {
    const options = typeof media_url === "string" ? { controls: true, "aria-label": "Video message" } : media_url;
    media.forEach((videoSrc) => {
        const posterPath = resolveImagePath(EntityType.CHAT, PictureType.POSTER, `${typeof media_url === "string" ? media_url : videoSrc}.jpg`);
        const videox = VideoPlayer({
            src: videoSrc,
            muted: true,
            poster: posterPath,
            controls: Boolean(options.controls),
            autoplay: false,
        }, typeof media_url === "string" ? media_url : videoSrc);

        mediaContainer.appendChild(videox as HTMLElement);
    });
}