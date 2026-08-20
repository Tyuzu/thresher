import "../../../css/inistyles/eventpage4.css";
import { viewEventAnalytics } from "../../services/event/eventAnalytics.ts";

async function EventAnalytics(isLoggedIn,  eventid, contentContainer) {
    viewEventAnalytics(contentContainer, isLoggedIn,eventid )
}


export { EventAnalytics };
