import "../../../css/inistyles/postpage6.css";
import "../../../css/inistyles/postpage6_new.css";
import { displayPost } from '../../services/posts/postDisplay.js';

async function Post(isLoggedIn, postid, contentContainer) {
    displayPost(isLoggedIn, postid, contentContainer)
}

export { Post };
