import "../../../css/inistyles/itinerary5.css";
import { displayItinerary } from "../../services/itinerary/itineraryDisplay.js";

async function Itinerary(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayItinerary(isLoggedIn, contentContainer);
}

export { Itinerary };
