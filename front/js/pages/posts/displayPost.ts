
import "../../../css/inistyles/postpage6.css";
import "../../../css/inistyles/postpage6_new.css";
import { displayPost } from "../../services/posts/postDisplay.js";

export async function Post(
  isLoggedIn: boolean,
  postid: string,
  contentContainer: HTMLElement
): Promise<void> {
  displayPost(isLoggedIn, postid, contentContainer);
}
