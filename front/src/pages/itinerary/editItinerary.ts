
import { editItinerary } from "../../services/itinerary/itineraryEdit.js";

export async function EditItinerary(
  isLoggedIn: boolean,
  id: number,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  editItinerary(contentContainer, isLoggedIn, id);
}
