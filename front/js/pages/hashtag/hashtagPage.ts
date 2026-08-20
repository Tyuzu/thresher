import "../../../css/inistyles/hashtags1.css";
import { displayHashtag } from "../../services/hashtag/hashtagService.ts";

async function Hashtag(isLoggedIn,  hashtag, contentContainer) {
    contentContainer.innerHTML = '';
    displayHashtag(contentContainer, hashtag, isLoggedIn);
}

export { Hashtag };
