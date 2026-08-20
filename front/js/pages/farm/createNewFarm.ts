import { createFarm } from "../../services/crops/farm/createFarm.ts";

async function CreateFarm(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createFarm(isLoggedIn, contentContainer);
}

export { CreateFarm };
