import "../../../css/inistyles/maps.css";
import { createElement } from "../../components/createElement.js";
import { displayGtaMap } from "../../services/GTAmap/gtamap.js";

export async function MapGTA(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  const mapcon = createElement("div", { class: "mapcon" });
  contentContainer.appendChild(mapcon);
  displayGtaMap(mapcon, isLoggedIn);
}