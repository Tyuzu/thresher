import { createElement } from "../../components/createElement.js";
import { displayGenericMap } from "../../services/remap/displayGenericMap.js";

async function MapRemap(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    const mapcon = createElement("div", { class: "mapcon" }, []);
    contentContainer.appendChild(mapcon);
    displayGenericMap(mapcon);
}

export { MapRemap };
