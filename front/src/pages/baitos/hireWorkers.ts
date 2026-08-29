
import "../../../css/inistyles/workers.css";
import { displayHireWorkers } from "../../services/baitos/workers/displayHires.js";

export async function HireWorkers(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  displayHireWorkers(isLoggedIn, contentContainer);
}