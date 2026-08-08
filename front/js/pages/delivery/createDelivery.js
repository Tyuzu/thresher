import { CreateDelivery } from "../../services/deliveries/createDelivery.js";

async function Createdelivery(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    CreateDelivery(isLoggedIn, contentContainer);
}

export { Createdelivery };
