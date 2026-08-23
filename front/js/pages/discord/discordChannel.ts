

import { displayChannelPage } from "../../services/discord/displayChannelPage.js";

export async function DiscordChannel(
  isLoggedIn: boolean,
  serverid: string,
  channelid: string,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayChannelPage(contentContainer, serverid, channelid, isLoggedIn);
}