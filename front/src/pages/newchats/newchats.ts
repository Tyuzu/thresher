
import "../../../css/inistyles/newchat.css";
import { displayChats } from "../../services/newchat/newchats.js";

export async function NewChats(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayChats(contentContainer, isLoggedIn);
}
