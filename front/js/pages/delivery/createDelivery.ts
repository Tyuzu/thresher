import { CreateDelivery } from "../../services/deliveries/createDelivery.ts";

async function Createdelivery(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    CreateDelivery(contentContainer, isLoggedIn);
}

export { Createdelivery };
