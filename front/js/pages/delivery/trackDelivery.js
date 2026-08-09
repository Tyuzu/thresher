import "../../../css/inistyles/deliverypage.css";
import { DeliveryTracking } from '../../services/deliveries/DeliveryTracking.js';

async function TrackDelivery(isLoggedIn, er, deliveryid, contentContainer) {
    await DeliveryTracking(contentContainer, deliveryid, isLoggedIn);
}

export { TrackDelivery };
export default TrackDelivery;