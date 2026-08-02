import "../../../css/inistyles/baitos6.css";
import { displayBaitos } from "../../services/baitos/DisplayBaitos.js";

async function Baitos(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayBaitos(contentContainer, isLoggedIn);
}

export { Baitos };
