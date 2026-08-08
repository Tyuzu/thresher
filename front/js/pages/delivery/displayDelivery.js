import "../../../css/inistyles/deliverypage.css";
import { displaydelivery } from '../../services/deliveries/displayDelivery.js';

async function Delivery(isLoggedIn, deliveryid, contentContainer) {
    displaydelivery(isLoggedIn, deliveryid, contentContainer);
}

export { Delivery };
