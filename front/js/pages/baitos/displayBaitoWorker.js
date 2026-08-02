import "../../../css/inistyles/workerpage3.css";
import { displayWorkerPage } from '../../services/baitos/workers/displayWorkerPage.js';

async function Worker(isLoggedIn,  workerid, contentContainer) {
    displayWorkerPage(contentContainer, isLoggedIn, workerid)
}

export { Worker };
