import "../../../css/farmstyles/cropwiki.css";
// import { displayAboutCrop } from "../../services/crops/crop/about/cropAboutPage.ts";
import { displayAboutCrop } from "../../services/crops/crop/cropAboutPage.ts";

async function AboutCrop(isLoggedIn,  cropID, contentContainer) {
    contentContainer.innerHTML = '';
    displayAboutCrop(contentContainer, cropID, isLoggedIn);
}

export { AboutCrop };
