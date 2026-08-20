import { createElement } from "../../components/createElement.ts";
import {
  resolveImagePath,
  EntityType,
  PictureType,
} from "../../utils/imagePaths.ts";
import { ImageGallery } from "../../components/ui/IMageGallery.ts";
import Button from "../../components/base/Button.ts";
import { getState } from "../../state/state.ts";
import { updateImageWithCrop } from "../../utils/bannerEditor.ts";

export function renderProductGallery(product, refresh) {
  const gallerySection = createElement(
    "div",
    { class: "gallery-section" },
    []
  );

  try {
    const imageUrls = [];

    if (product?.banner) {
      imageUrls.push(
        resolveImagePath(
          EntityType.PRODUCT,
          PictureType.BANNER,
          product.banner
        )
      );
    }

    if (
      Array.isArray(product?.images) &&
      product.images.length > 0
    ) {
      imageUrls.push(
        ...product.images
          .filter(Boolean)
          .map((name) =>
            resolveImagePath(
              EntityType.PRODUCT,
              PictureType.PHOTO,
              name
            )
          )
      );
    }

    const galleryContainer = createElement(
      "div",
      { class: "product-gallery-wrapper" }
    );

    if (imageUrls.length > 0) {
      galleryContainer.appendChild(
        ImageGallery([...new Set(imageUrls)])
      );
    } else {
      galleryContainer.appendChild(
        createElement(
          "p",
          { class: "no-images" },
          ["No images available"]
        )
      );
    }

    gallerySection.appendChild(galleryContainer);

    const currentUserId = getState("user").userid;

    const isCreator =
      Boolean(getState("token")) &&
      currentUserId &&
      product.userid === currentUserId;

    if (isCreator) {
      // const uploadControls = createElement(
      //   "div",
      //   { class: "gallery-actions" }
      // );

      gallerySection.appendChild(
        Button(
          "Add Gallery Image",
          `add-gallery-image-${product.productid}`,
          {
            click: () => {
              updateImageWithCrop({
                entityType: EntityType.PRODUCT,
                imageType: "images",
                stateKey: "images",
                stateEntityKey: "product",
                pictureType: PictureType.PHOTO,
                entityId: product.productid,
                multiple: true,
                onSuccess: () => {
                  if (typeof refresh === "function") {
                    refresh();
                  }
                },
              });
            },
          },
          "edit-gallery-images"
        )
      );

      // gallerySection.appendChild(uploadControls);
    }
  } catch (err) {
    console.error(
      "Error rendering product gallery:",
      err
    );

    gallerySection.appendChild(
      createElement(
        "p",
        { class: "no-images" },
        ["Failed to load images"]
      )
    );
  }

  return gallerySection;
}