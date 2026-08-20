import "../../../css/inistyles/maps.css";
import { createElement } from "../../components/createElement.ts";
import { displayGtaMap } from "../../services/GTAmap/gtamap.ts";

async function MapGTA(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    const mapcon = createElement("div", { class: "mapcon" }, []);
    contentContainer.appendChild(mapcon);
    displayGtaMap(mapcon, isLoggedIn);
}

export { MapGTA };
