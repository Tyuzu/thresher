import "../../../css/farmstyles/farmpage3.css";
import { displayFarm } from '../../services/crops/farm/farmDisplay.js';

async function Farm(isLoggedIn,  farmid, contentContainer) {
    displayFarm(isLoggedIn, farmid, contentContainer)
}

export { Farm };
