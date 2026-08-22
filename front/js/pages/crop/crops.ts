import "../../../css/farmstyles/crops8.css";
import { displayCrops } from "../../services/crops/crop/crops.js";

async function Crops(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayCrops(contentContainer, isLoggedIn);
}

export { Crops };
