import Imagex from "../../../components/base/Imagex.js";
import { createElement } from "../../../components/createElement.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";

export function displayCropCard(crop) {
    const card = createElement("div", { class: "crop-card" });

    if (crop.banner) {
        const cropImg = Imagex( {
          src: resolveImagePath(EntityType.CROP, PictureType.BANNER, crop.Banner),
          alt: crop.name,
          classes: "crop-card-image"
        });
        card.appendChild(cropImg);
      }
      

    const hasDiscount = Number(crop.discount || 0) > 0;
    const discountedPrice = hasDiscount ? crop.price * (1 - Number(crop.discount || 0) / 100) : crop.price;

    card.append(
        createElement("h4", {}, [crop.name]),
        createElement("p", {}, [`💰 ₹${hasDiscount ? discountedPrice : crop.price} per ${crop.unit}`]),
        hasDiscount ? createElement("p", { style: "color:#e53935;font-weight:bold;" }, [`${crop.discount}% OFF`]) : null,
        createElement("p", {}, [`📦 In Stock: ${crop.quantity}`]),
        createElement("p", {}, [`👨‍🌾 Farm: ${crop.farmName || "Unknown"}`])
    );

    return card;
}
