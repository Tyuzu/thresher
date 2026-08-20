import { createPost } from "../../services/posts/createOrEditPost.ts";

async function CreatePost(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createPost(isLoggedIn, contentContainer);
}

export { CreatePost };
