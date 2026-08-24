
import "../../../css/inistyles/workerpage3.css";
import { displayWorkerPage } from "../../services/baitos/workers/displayWorkerPage.js";

export async function Worker(
  isLoggedIn: boolean,
  workerid: string,
  contentContainer: HTMLElement
): Promise<void> {
  displayWorkerPage(contentContainer, isLoggedIn, workerid);
}
