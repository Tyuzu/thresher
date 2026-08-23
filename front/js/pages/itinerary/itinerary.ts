
import { displayItinerary } from "../../services/itinerary/itineraryDisplay.js";

export async function Itinerary(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayItinerary(isLoggedIn, contentContainer);
}