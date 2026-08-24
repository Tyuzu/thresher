
import "../../../css/farmstyles/recipepage5.css";
import { displayRecipe } from "../../services/recipes/recipePage.js";

export async function Recipe(
  isLoggedIn: boolean,
  recipe: string | Record<string, unknown>,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayRecipe(contentContainer, isLoggedIn, recipe);
}
