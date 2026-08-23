import { createEvent } from "../../services/event/creadit.js";

export async function CreateEvent(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  createEvent(isLoggedIn, contentContainer);
}