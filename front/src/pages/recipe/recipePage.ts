
import "../../../css/farmstyles/recipepage5.css";
import { displayRecipe } from "../../services/recipes/recipePage.js";

export async function Recipe(
  isLoggedIn: boolean,
  recipeid: string | number,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayRecipe(contentContainer, isLoggedIn, recipeid);
}
