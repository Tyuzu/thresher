import "../../../css/inistyles/itinerary5.css";
import { displayItinerary } from "../../services/itinerary/itineraryDisplay.ts";

async function Itinerary(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayItinerary(isLoggedIn, contentContainer);
}

export { Itinerary };
