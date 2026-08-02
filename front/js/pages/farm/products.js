import "../../../css/farmstyles/protools2.css";
import { displayItems } from "../../services/crops/products/displayItems.js";

async function Products(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayItems("product", contentContainer, isLoggedIn);
}

export { Products };
