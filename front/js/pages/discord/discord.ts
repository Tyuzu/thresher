import { displayDiscord } from "../../services/discord/discord.js";

export async function Discord(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayDiscord(contentContainer, isLoggedIn);
}