
import "../../../css/inistyles/mecaht.css";
import "../../../css/inistyles/onechat1.css";
import { displayChats } from "../../services/merechats/merechat.js";

export async function MeChats(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayChats(contentContainer, isLoggedIn);
}
