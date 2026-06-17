import { resolveImagePath, PictureType } from "../../utils/imagePaths.js";
import { createElement } from "../../components/createElement.js";
import Imagex from "./Imagex.js";
import { updateImageWithCrop } from "../../utils/bannerEditor.js";
import Sightbox from "../ui/Sightbox_zoom.mjs";

const Bannerx = ({
    isCreator = false,
    bannerkey = "",
    banneraltkey = "",
    bannerentitytype = "",
    stateentitykey = "",
    bannerentityid = ""
} = {}) => {
    const bannerSection = createElement("div", {
        class: `${stateentitykey}-banner`
    });

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
        );

        bannerSection.appendChild(bannerEditButton);
    }

    return bannerSection;
};

export default Bannerx;
export { Bannerx };