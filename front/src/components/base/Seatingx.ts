import { resolveImagePath, PictureType } from "../../utils/imagePaths.js";
import { createElement } from "../createElement.js";
import Imagex from "./Imagex.js";
import { updateImageWithCrop } from "../../utils/bannerEditor.js";
import Sightbox from "../ui/Sightbox_zoom.js";

export interface SeatingxProps {
  isCreator?: boolean;
  bannerkey?: string;
  banneraltkey?: string;
  bannerentitytype?: string;
  stateentitykey?: string;
  bannerentityid?: string | number;
  bannerPicType?: PictureType | string;
}

export function Seatingx({
  isCreator = false,
  bannerkey = "",
  banneraltkey = "",
  bannerentitytype = "",
  stateentitykey = "",
  bannerentityid = "",
  bannerPicType = ""
}: SeatingxProps = {}): HTMLElement {
  // --- Container ---
  const bannerSection = createElement("div", { class: `${stateentitykey}-${bannerPicType}` }) as HTMLElement;

  // --- Image ---
  const bannerSrc = resolveImagePath(bannerentitytype, bannerPicType as PictureType, bannerkey);
  const altText = banneraltkey || `${bannerentitytype} banner`;

  const bannerImage = Imagex({
    id: `${stateentitykey}-${bannerPicType}-img`,
    src: bannerSrc,
    alt: altText,
    loading: "lazy",
    classes: `${stateentitykey}-${bannerPicType}`
  });

  if (bannerImage instanceof Node) {
    bannerImage.addEventListener("click", () => Sightbox(bannerSrc, "image"));
    bannerSection.appendChild(bannerImage);
  } else {
    console.error("Imagex did not return a DOM node:", bannerImage);
  }

  // --- Edit Button (if creator) ---
  if (isCreator === true) {
    const bannerEditButton = createElement("button", { class: "edit-banner-pic" }, [`Edit ${bannerPicType}`]) as HTMLElement;

    bannerEditButton.addEventListener("click", () => {
      updateImageWithCrop({
        entityType: bannerentitytype,
        imageType: String(bannerPicType),
        stateKey: String(bannerPicType),
        stateEntityKey: stateentitykey,
        previewElementId: `${stateentitykey}-${bannerPicType}-img`,
        pictureType: bannerPicType as PictureType,
        entityId: bannerentityid
      });
    });

    bannerSection.appendChild(bannerEditButton);
  }

  return bannerSection;
};

export default Seatingx;
export { Seatingx as SeatingxComponent };