import { createFarm } from "../../services/crops/createFarm.ts";

async function Create(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createFarm(isLoggedIn, contentContainer);
}

export { Create };
