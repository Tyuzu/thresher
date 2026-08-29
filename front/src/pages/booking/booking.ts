import "../../../css/subpages/booking.css";
import { displayBooking } from "../../services/booking/booking.js";

export async function Booking(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  displayBooking({ entityType: "event", entityId: "booking", userId: "guest", isAdmin: !isLoggedIn }, contentContainer);
}