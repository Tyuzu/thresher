import "../../../css/subpages/booking1.css";
import { displayBooking } from '../../services/booking/booking';

async function Booking(isLoggedIn, contentContainer) {
    displayBooking(isLoggedIn, contentContainer)
}

export { Booking };
