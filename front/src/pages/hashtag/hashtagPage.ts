import "../../../css/inistyles/hashtags.css";
import { displayHashtag } from "../../services/hashtag/hashtagService.js";

export async function Hashtag(
  isLoggedIn: boolean,
  hashtag: string,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayHashtag(contentContainer, hashtag, isLoggedIn);
}
