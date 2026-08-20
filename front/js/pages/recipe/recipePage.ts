import "../../../css/farmstyles/recipepage5.css";
import { displayRecipe } from "../../services/recipes/recipePage.ts";

async function Recipe(isLoggedIn, recipe, contentContainer) {
    contentContainer.innerHTML = '';
    displayRecipe(contentContainer, isLoggedIn, recipe);
}

export { Recipe };
