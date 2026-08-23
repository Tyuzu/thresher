import { createArtist } from "../../services/artist/createOrEditArtist.js";

async function CreateArtist(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  createArtist(isLoggedIn, contentContainer);
}

export { CreateArtist };