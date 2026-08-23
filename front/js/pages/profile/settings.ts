
import "../../../css/inistyles/settings.css";
import { displaySettings } from "../../services/usersettings/settingsService.js";

export async function Settings(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displaySettings(isLoggedIn, contentContainer);
}
