import "../../../css/inistyles/artistpage.css";
import "../../../css/subpages/artistsongstab.css";
import "../../../css/subpages/fanmedia.css";
import "../../../css/subpages/livpage.css";
import "../../../css/subpages/livcon.css";
import { displayArtist } from "../../services/artist/artistPage.js";

async function Artist(
  isLoggedIn: boolean,
  artistID: string,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayArtist(contentContainer, artistID, isLoggedIn);
}

export { Artist };
