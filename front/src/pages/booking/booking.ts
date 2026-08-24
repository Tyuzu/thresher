import "../../../css/subpages/booking1.css";
import { displayBooking } from "../../services/booking/booking.js";

export async function Booking(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  displayBooking(isLoggedIn, contentContainer);
}