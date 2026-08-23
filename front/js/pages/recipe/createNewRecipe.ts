import { createRecipe } from "../../services/recipes/createOrEditRecipe.js";

export async function CreateRecipe(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  createRecipe(contentContainer);
}
