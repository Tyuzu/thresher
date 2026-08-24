import { resolveImagePath, PictureType } from "../../utils/imagePaths.js";
import { createElement } from "../../components/createElement.js";
import Imagex from "./Imagex.js";
import { updateImageWithCrop } from "../../utils/bannerEditor.js";
import Sightbox from "../ui/Sightbox_zoom.js";

export interface BannerxProps {
    isCreator?: boolean;
    bannerkey?: string;
    banneraltkey?: string;
    bannerentitytype?: string;
    stateentitykey?: string;
    bannerentityid?: string | number;
}

export function Bannerx({
    isCreator = false,
    bannerkey = "",
    banneraltkey = "",
    bannerentitytype = "",
    stateentitykey = "",
    bannerentityid = ""
}: BannerxProps = {}): HTMLElement {
    const bannerSection = createElement("div", {
        class: `${stateentitykey}-banner`
    }) as HTMLElement;

    const bannerSrc = resolveImagePath(
        bannerentitytype,
        PictureType.BANNER,
        bannerkey
    );

    const altText = banneraltkey || `${bannerentitytype} banner`;

    const bannerImage = Imagex({
        id: `${stateentitykey}${bannerentityid}-banner-img`,
        src: bannerSrc,
        alt: altText,
        loading: "lazy",
        classes: `${stateentitykey}-banner`
    });

    if (bannerImage instanceof Node) {
        bannerImage.addEventListener("click", () => {
            Sightbox(bannerSrc, "image");
        });

        bannerSection.appendChild(bannerImage);
    } else {
        console.error("Imagex did not return a DOM node:", bannerImage);
    }

    if (isCreator) {
        const bannerEditButton = createElement(
            "button",
            {
                class: "edit-banner-pic",
                type: "button",
                events: {
                    click() {
                        updateImageWithCrop({
                            entityType: bannerentitytype,
                            imageType: "banner",
                            stateKey: "banner",
                            stateEntityKey: stateentitykey,
                            previewElementId: `${stateentitykey}${bannerentityid}-banner-img`,
                            pictureType: PictureType.BANNER,
                            entityId: bannerentityid
                        });
                    }
                }
            },
            ["Edit Banner"]
        ) as HTMLElement;

        bannerSection.appendChild(bannerEditButton);
    }

    return bannerSection;
}

export default Bannerx;