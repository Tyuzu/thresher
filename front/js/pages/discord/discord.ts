import { displayDiscord} from "../../services/discord/discord.ts";

async function Discord(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayDiscord(contentContainer, isLoggedIn);
}

export { Discord };
