
import "../../../css/inistyles/driverDash.css";
import { DriverDashboard } from "../../services/deliveries/DriverDashboard.js";

export async function DriverDash(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  DriverDashboard(contentContainer, isLoggedIn);
}
