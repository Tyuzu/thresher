import { createRecipe } from "../../services/recipes/createOrEditRecipe.ts";

async function CreateRecipe(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createRecipe(contentContainer, isLoggedIn);
}

export { CreateRecipe };
