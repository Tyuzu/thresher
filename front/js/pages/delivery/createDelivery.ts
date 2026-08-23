import { CreateDelivery } from "../../services/deliveries/createDelivery.js";

export async function Createdelivery(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  CreateDelivery(contentContainer, isLoggedIn);
}
