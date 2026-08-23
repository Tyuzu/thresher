
import { displayOneChat } from "../../services/merechats/onechat.js";

export async function OneChatPage(
  isLoggedIn: boolean,
  chatid: string,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayOneChat(contentContainer, chatid);
}
