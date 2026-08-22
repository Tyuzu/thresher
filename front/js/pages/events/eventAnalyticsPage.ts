import "../../../css/inistyles/eventpage4.css";
import { viewEventAnalytics } from "../../services/event/eventAnalytics.js";

async function EventAnalytics(isLoggedIn,  eventid, contentContainer) {
    viewEventAnalytics(contentContainer, isLoggedIn,eventid )
}


export { EventAnalytics };
