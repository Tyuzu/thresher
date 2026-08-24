import { displayMerch } from "../../services/merch/merchPage.js";

export async function Merch(
  isLoggedIn: boolean,
  merchid: string,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayMerch(contentContainer, merchid, isLoggedIn,"","");
}
