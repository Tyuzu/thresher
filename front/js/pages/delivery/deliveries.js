import "../../../css/inistyles/deliveries.css";
import { displaydeliveries } from "../../services/deliveries/deliveries.js";

async function Deliveries(isLoggedIn, contentContainer) {
  contentContainer.innerHTML = "";
  displaydeliveries(contentContainer, isLoggedIn);
}

export { Deliveries };
export default Deliveries;