import "../../../css/inistyles/deliverypage.css";
import { displayDelivery } from '../../services/deliveries/displayDelivery.js';

async function Delivery(isLoggedIn, er, deliveryid, contentContainer) {
    await displayDelivery(contentContainer, deliveryid, isLoggedIn);
}

export { Delivery };
export default Delivery;