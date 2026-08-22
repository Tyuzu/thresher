import "../../../css/inistyles/posts5.css";
import { displayPosts } from "../../services/posts/PostsService.js";

async function Posts(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayPosts(contentContainer, isLoggedIn);
}

export { Posts };
