import "../../../css/inistyles/search.css";
import { displaySearch } from "../../services/search/searchService.ts";

async function Search(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displaySearch(contentContainer, isLoggedIn);
}

export { Search };
