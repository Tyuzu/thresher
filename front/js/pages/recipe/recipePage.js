import { displayRecipe } from "../../services/recipes/recipePage.js";

async function Recipe(isLoggedIn, t, recipe, contentContainer) {
    contentContainer.innerHTML = '';
    displayRecipe(contentContainer, isLoggedIn, recipe);
}

export { Recipe };
