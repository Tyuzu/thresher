import "../../../css/inistyles/artists1.css";
import { displayArtists } from "../../services/artist/artists.js";

async function Artists(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayArtists(contentContainer, isLoggedIn);
}

export { Artists };
