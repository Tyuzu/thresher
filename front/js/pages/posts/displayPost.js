import { displayPost } from '../../services/posts/postDisplay.js';

async function Post(isLoggedIn, t, postid, contentContainer) {
    displayPost(isLoggedIn, postid, contentContainer)
}

export { Post };
