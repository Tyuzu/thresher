
import "../../../css/inistyles/deliveryTrack.css";
import { DeliveryTracking } from "../../services/deliveries/DeliveryTracking.js";

export async function TrackDelivery(
  isLoggedIn: boolean,
  er: unknown,
  deliveryid: string,
  contentContainer: HTMLElement
): Promise<void> {
  await DeliveryTracking(contentContainer, deliveryid, isLoggedIn);
}