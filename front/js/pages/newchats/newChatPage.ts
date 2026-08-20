
import { displayNewChat } from "../../services/newchat/displayNewchat.ts";
import { getState } from "../../state/state.ts";

async function NewChatPage(isLoggedIn,  chatid, contentContainer) {
    contentContainer.innerHTML = '';
    const user = getState("user").userid;
    displayNewChat(contentContainer, chatid, isLoggedIn, user);
}

export { NewChatPage };