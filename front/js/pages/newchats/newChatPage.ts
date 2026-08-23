import { displayNewChat } from "../../services/newchat/displayNewchat.js";
import { getState } from "../../state/state.js";

export async function NewChatPage(
  isLoggedIn: boolean,
  chatid: string,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  const user = (getState("user") as { userid: string }).userid;
  displayNewChat(contentContainer, chatid, isLoggedIn, user);
}
