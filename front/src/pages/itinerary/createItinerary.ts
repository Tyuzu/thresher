
import "../../../css/inistyles/itinerary.css";
import { createItinerary } from "../../services/itinerary/itineraryCreate.js";

export async function CreateItinerary(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  const content = document.createElement("div");
  content.className = "create-section";
  contentContainer.appendChild(content);

  createItinerary(isLoggedIn, content);
}
