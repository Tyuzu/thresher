
import { displayNewChat } from "../../services/newchat/displayNewchat";
import { getState } from "../../state/state";

async function NewChatPage(isLoggedIn, chatid, contentContainer) {
    contentContainer.innerHTML = '';
    let user = getState("user");
    displayNewChat(contentContainer, chatid, isLoggedIn, user);
}

export { NewChatPage };