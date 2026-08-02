import "../../../css/inistyles/musicon.css";
import { displayMusic } from "../../services/musicon/wuzic.js";

async function Music(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayMusic(contentContainer, isLoggedIn);
}

export { Music };
