import { displayDeliveries } from "../../services/deliveries/allDeliveryPages.js";

async function DeliveryPage(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayDeliveries(contentContainer, isLoggedIn);
}

export { DeliveryPage };
