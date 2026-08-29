
import "../../../css/farmstyles/recipes.css";
import { displayRecipes } from "../../services/recipes/recipes.js";

export async function Recipes(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayRecipes(contentContainer, isLoggedIn);
}
