
import { displayNewChat } from "../../services/newchat/displayNewchat.js";
import { getState } from "../../state/state.js";

async function NewChatPage(isLoggedIn,  chatid, contentContainer) {
    contentContainer.innerHTML = '';
    const user = getState("user");
    displayNewChat(contentContainer, chatid, isLoggedIn, user);
}

export { NewChatPage };