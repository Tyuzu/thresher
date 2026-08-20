import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.ts";
import VideoPlayer from "../../../components/ui/VideoPlayer.ts";

function RenderVideoPost(container, videos, _id = "", ext = "") {
  videos.forEach(v => {
    const src = resolveImagePath(
      EntityType.CHAT,
      PictureType.VIDEO,
      v + ext
    );

    const poster = resolveImagePath(
      EntityType.CHAT,
      PictureType.THUMB,
      `${v}.jpg`
    );

    const video = VideoPlayer(
      {
        src,
        poster,
        controls: true,
        muted: true
      },
      v
    );

    container.appendChild(video);
  });
}

export { RenderVideoPost };
