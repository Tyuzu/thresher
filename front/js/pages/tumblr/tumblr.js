import "../../../css/inistyles/social.css";
// import "../../../css/inistyles/feedposts.css";
import "../../../css/inistyles/feedimages.css";
import { displayTumblr } from "../../services/feed/tumblr/tumblr.js";

async function Tumblr(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayTumblr(isLoggedIn, contentContainer);
}

export { Tumblr };
