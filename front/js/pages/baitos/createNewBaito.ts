import { createBaito } from "../../services/baitos/create/createBaito.ts";

async function CreateBaito(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createBaito(isLoggedIn, contentContainer);
}

export { CreateBaito };
