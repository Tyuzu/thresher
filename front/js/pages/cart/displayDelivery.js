import { displayDelivery } from "../../services/deliveries/allDeliveryPages.js";

async function Delivery(isLoggedIn, deliveryid, contentContainer) {
    contentContainer.innerHTML = '';
    displayDelivery(contentContainer, deliveryid, isLoggedIn);
}

export { Delivery };
