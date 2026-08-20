import { createArtist } from "../../services/artist/createOrEditArtist.ts";

async function CreateArtist(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createArtist(isLoggedIn, contentContainer);
}

export { CreateArtist };
