
import "../../../css/inistyles/posts.css";
import { displayPosts } from "../../services/posts/PostsService.js";

export async function Posts(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayPosts(contentContainer, isLoggedIn);
}
