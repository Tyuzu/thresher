import "../../../css/inistyles/baitopage3.css";
import { displayBaito } from '../../services/baitos/onebaito/baitoDisplay.js';

async function Baito(isLoggedIn,  baitoid, contentContainer) {
    displayBaito(isLoggedIn, baitoid, contentContainer)
}

export { Baito };
