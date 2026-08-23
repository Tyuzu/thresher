// import "../../css/home.css";
// import "../../css/farmstyles/crops8.css";
import "../../css/farmstyles/crops8.css";

// import { YoHome } from "../services/home/yohome.js";
import { displayCrops } from "../services/crops/crop/crops.js";

function Home(isLoggedIn, container) {
    displayCrops(container);
    // YoHome(isLoggedIn, container);
}

export { Home };
