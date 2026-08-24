import { createPost } from "../../services/posts/createOrEditPost.js";

export async function CreatePost(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  createPost(isLoggedIn, contentContainer);
}
