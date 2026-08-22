import "../../../css/inistyles/driverDash.css";
import { DriverDashboard } from "../../services/deliveries/DriverDashboard.js";

async function DriverDash(isLoggedIn, contentContainer) {
  contentContainer.innerHTML = "";
  DriverDashboard(contentContainer, isLoggedIn);
}

export { DriverDash };
export default DriverDash;