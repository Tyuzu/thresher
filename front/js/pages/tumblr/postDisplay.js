import "../../../css/inistyles/social.css";
import "../../../css/inistyles/feedposts.css";
import "../../../css/inistyles/feedimages.css";
import { displayPost } from '../../services/feed/postDisplay.js';

async function Post(isLoggedIn,  postid, contentContainer) {
    displayPost(isLoggedIn, postid, contentContainer);
}

export { Post };
