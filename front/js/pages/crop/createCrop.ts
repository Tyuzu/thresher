import { createCrop } from "../../services/crops/crop/createCrop.ts";

async function Create(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createCrop(isLoggedIn, contentContainer);
}

export { Create };
