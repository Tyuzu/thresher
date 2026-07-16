import { displayPost } from '../../services/feed/postDisplay.js';

async function Post(isLoggedIn, t, postid, contentContainer) {
    displayPost(isLoggedIn, postid, contentContainer);
}

export { Post };
