
import { displayOneChat } from "../../services/merechats/onechat";

async function OneChatPage(isLoggedIn, t, chatid, contentContainer) {
    contentContainer.innerHTML = '';
    displayOneChat(contentContainer, chatid, isLoggedIn);
}

export { OneChatPage };