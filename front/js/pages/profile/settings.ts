import "../../../css/inistyles/settings.css";
import { displaySettings } from "../../services/usersettings/settingsService.ts";

async function Settings(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displaySettings(isLoggedIn, contentContainer);
}

export { Settings };
