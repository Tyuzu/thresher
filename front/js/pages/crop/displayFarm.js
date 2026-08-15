import "../../../css/farmstyles/farmpage3.css";
import { displayFarm } from '../../services/crops/farm/farmDisplay.js';

async function Farm(isLoggedIn, farm, contentContainer) {
    console.log(isLoggedIn);
    console.log(farm.id);
    console.log(contentContainer);
    displayFarm(isLoggedIn, farm.id, contentContainer);
}

export { Farm };
