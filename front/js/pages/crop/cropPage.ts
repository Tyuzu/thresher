import "../../../css/farmstyles/croppage6.css";
import "../../../css/farmstyles/croppageform.css";
import { displayCrop } from "../../services/crops/crop/cropPage.js";

async function Crop(isLoggedIn,  cropID, contentContainer) {
    contentContainer.innerHTML = '';
    displayCrop(contentContainer, cropID, isLoggedIn);
}

export { Crop };
