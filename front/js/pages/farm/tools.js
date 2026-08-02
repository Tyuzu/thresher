import "../../../css/farmstyles/protools2.css";
import { displayItems } from "../../services/crops/products/displayItems.js";

async function Tools(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayItems("tool", contentContainer, isLoggedIn);
}

export { Tools };
