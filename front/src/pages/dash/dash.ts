import "../../../css/farmstyles/farmdash.css";
import "../../../css/farmstyles/orders.css";
import { displayDash } from "../../services/dashboards/farmDash.js";
// import { displayDash } from "../../services/dashboards/dashboard.js";

export async function Dash(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayDash(contentContainer, isLoggedIn);
}