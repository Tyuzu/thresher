import { displayWorkerPage } from '../../services/baitos/workers/displayWorkerPage.js';

async function Worker(isLoggedIn, t, workerid, contentContainer) {
    displayWorkerPage(contentContainer, isLoggedIn, workerid)
}

export { Worker };
