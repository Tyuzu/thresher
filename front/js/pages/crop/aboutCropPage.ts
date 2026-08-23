import "../../../css/farmstyles/cropwiki.css";
// import { displayAboutCrop } from "../../services/crops/crop/about/cropAboutPage.js";
import { displayAboutCrop } from "../../services/crops/crop/cropAboutPage.js";

export async function AboutCrop(
  isLoggedIn: boolean,
  cropID: string,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayAboutCrop(contentContainer, cropID, isLoggedIn);
}
