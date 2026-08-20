import "../../../css/inistyles/deliveries.css";
import { displayDeliveries } from "../../services/deliveries/deliveries.ts";

async function Deliveries(isLoggedIn, contentContainer) {
  contentContainer.innerHTML = "";
  displayDeliveries(contentContainer, isLoggedIn);
}

export { Deliveries };
export default Deliveries;