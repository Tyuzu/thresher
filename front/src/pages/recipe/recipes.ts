
import "../../../css/farmstyles/recipes3.css";
import { displayRecipes } from "../../services/recipes/recipes.js";

export async function Recipes(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayRecipes(contentContainer, isLoggedIn);
}
