import "../../../css/inistyles/artists1.css";
import { displayArtists } from "../../services/artist/artists.js";

async function Artists(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayArtists(contentContainer, isLoggedIn);
}

export { Artists };
