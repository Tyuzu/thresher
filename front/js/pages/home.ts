// import "../../css/home.css";
// import "../../css/farmstyles/crops8.css";
import "../../css/farmstyles/crops8.css";

// import { YoHome } from "../services/home/yohome.ts";
import { displayCrops } from "../services/crops/crop/crops.ts";

function Home(isLoggedIn, container) {
    displayCrops(container, isLoggedIn);
    // YoHome(isLoggedIn, container);
}

export { Home };
