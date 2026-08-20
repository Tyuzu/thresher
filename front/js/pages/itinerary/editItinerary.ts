import "../../../css/inistyles/itinerary5.css";
import { editItinerary } from "../../services/itinerary/itineraryEdit.ts";

async function EditItinerary(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    editItinerary(isLoggedIn, contentContainer);
}

export { EditItinerary };
