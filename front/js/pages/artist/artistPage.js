import { displayArtist } from "../../services/artist/artistPage.js";

async function Artist(isLoggedIn, t, artistID, contentContainer) {
    contentContainer.innerHTML = '';
    displayArtist(contentContainer, artistID, isLoggedIn);
}

export { Artist };
