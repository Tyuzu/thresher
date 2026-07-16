import { displayLiveStream } from "../../services/vlive/viewer/livePage.js";

async function Vlive(isLoggedIn, t, liveid, contentContainer) {
    displayLiveStream(isLoggedIn, liveid, contentContainer)
}


export { Vlive };
