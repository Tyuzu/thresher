import "../../../css/inistyles/artists1.css";
import { displayArtists } from "../../services/artist/artists.ts";

async function Artists(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayArtists(contentContainer, isLoggedIn);
}

export { Artists };
