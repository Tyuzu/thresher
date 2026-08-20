import "../../../css/inistyles/driverDash.css";
import { DriverDashboard } from "../../services/deliveries/DriverDashboard.ts";

async function DriverDash(isLoggedIn, contentContainer) {
  contentContainer.innerHTML = "";
  DriverDashboard(contentContainer, isLoggedIn);
}

export { DriverDash };
export default DriverDash;