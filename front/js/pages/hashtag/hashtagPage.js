import { displayHashtag } from "../../services/hashtag/hashtagService.js";

async function Hashtag(isLoggedIn, t, hashtag, contentContainer) {
    contentContainer.innerHTML = '';
    displayHashtag(contentContainer, hashtag, isLoggedIn);
}

export { Hashtag };
