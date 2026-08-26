
import "../../../css/inistyles/deliverypage.css";
import { displayDelivery } from "../../services/deliveries/displayDelivery.js";

export async function Delivery(
  isLoggedIn: boolean,
  er: unknown,
  deliveryid: string,
  contentContainer: HTMLElement
): Promise<void> {
  await displayDelivery(contentContainer, deliveryid);
}
