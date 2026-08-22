import { CreateDelivery } from "../../services/deliveries/createDelivery.js";

async function Createdelivery(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    CreateDelivery(contentContainer, isLoggedIn);
}

export { Createdelivery };
