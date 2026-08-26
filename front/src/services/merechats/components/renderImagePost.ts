import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import ZoomBox from "../../../components/ui/zoomBox/ZoomBox.js";
import Imagex from "../../../components/base/Imagex.js";

/**
 * Renders an image list/grid container for post media elements.
 * 
 * @param mediaContainer - The target HTMLElement container to append images to
 * @param media - Array of media identifiers/IDs
 */
export async function RenderImagePost(
  mediaContainer: HTMLElement, 
  media: (string | number)[]
): Promise<void> {
  const imageList = document.createElement("ul");
  imageList.className = "preview_image_wrap";

  const fullPaths = media.map(id =>
    resolveImagePath(EntityType.CHAT, PictureType.PHOTO, `${id}`)
  );

  media.forEach((id, index) => {
    const li = document.createElement("li");

    const thumb = resolveImagePath(
      EntityType.CHAT,
      PictureType.THUMB,
      `${id}.jpg`
    );
    
    // Assuming Imagex utilizes the options-object pattern similar to your Button component
    const img = Imagex({
      src: thumb,
      loading: "lazy",
      alt: "Image",
      classes: "post-image",
      events: {
        click: () => ZoomBox(fullPaths, index)
      }
    });

    li.appendChild(img);
    imageList.appendChild(li);
  });

  mediaContainer.appendChild(imageList);
}