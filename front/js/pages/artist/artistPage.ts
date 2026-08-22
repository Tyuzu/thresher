import "../../../css/inistyles/artistpage3.css";
import "../../../css/subpages/artistsongstab.css";
import "../../../css/subpages/fanmedia.css";
import "../../../css/subpages/livpage.css";
import "../../../css/subpages/livcon.css";
import { displayArtist } from "../../services/artist/artistPage.js";

async function Artist(isLoggedIn,  artistID, contentContainer) {
    contentContainer.innerHTML = '';
    displayArtist(contentContainer, artistID, isLoggedIn);
}

export { Artist };
