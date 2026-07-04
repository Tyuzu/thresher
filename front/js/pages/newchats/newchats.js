
import { displayChats } from "../../services/newchat/newchats.js";

async function NewChats(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayChats(contentContainer, isLoggedIn);
}

export { NewChats };
