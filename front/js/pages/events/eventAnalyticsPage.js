import { viewEventAnalytics } from "../../services/event/eventAnalytics.js";

async function EventAnalytics(isLoggedIn, t, eventid, contentContainer) {
    viewEventAnalytics(contentContainer, isLoggedIn,eventid )
}


export { EventAnalytics };
