
import "../../../css/inistyles/search.css";
import { displaySearch } from "../../services/search/searchService.js";

export async function Search(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displaySearch(contentContainer);
}
