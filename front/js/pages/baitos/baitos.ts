import "../../../css/inistyles/baitos6.css";
import { displayBaitos } from "../../services/baitos/DisplayBaitos.ts";

async function Baitos(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayBaitos(contentContainer, isLoggedIn);
}

export { Baitos };
