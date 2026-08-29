
import "../../../css/farmstyles/recipepage.css";
import { displayRecipe } from "../../services/recipes/recipePage.js";

export async function Recipe(
  isLoggedIn: boolean,
  // router passes params object when route has params, or a plain id in other calls
  recipeidOrParams: string | number | Record<string, string | undefined>,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  // If router provided an object of params, extract `id` key
  let recipeid: string | number | undefined;
  if (typeof recipeidOrParams === "object" && recipeidOrParams !== null) {
    recipeid = (recipeidOrParams as Record<string, string | undefined>).id;
  } else {
    recipeid = recipeidOrParams as string | number;
  }
  // Fallback: coerce undefined to empty string to avoid sending [object Object]
  displayRecipe(contentContainer, isLoggedIn, recipeid ?? "");
}
