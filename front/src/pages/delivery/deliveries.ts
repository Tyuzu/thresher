
import "../../../css/inistyles/deliveries.css";
import { displayDeliveries } from "../../services/deliveries/deliveries.js";

export async function Deliveries(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayDeliveries(isLoggedIn, contentContainer);
}

export default Deliveries;
