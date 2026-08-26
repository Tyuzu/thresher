import { apiFetch } from "../../api/api.js";
import type { Recipe } from "./types/recipe.js";

export interface RecipeListResponse {
  recipes?: Recipe[];
  [key: string]: unknown;
}

export async function fetchRecipes(): Promise<Recipe[]> {
  const resp = await apiFetch<Recipe[] | RecipeListResponse>("/recipes?offset=0&limit=5000");
  if (Array.isArray(resp)) return resp;
  return Array.isArray(resp?.recipes) ? resp.recipes : [];
}

export async function fetchRecipeById(recipeid: string | number): Promise<Recipe> {
  return await apiFetch<Recipe>(`/recipes/recipe/${recipeid}`);
}

export async function saveRecipeRequest(
  formData: FormData,
  mode: "create" | "edit" = "create",
  recipeId?: string | number
): Promise<{ recipeid?: string | number }> {
  const endpoint = mode === "edit" ? `/recipes/recipe/${recipeId}` : "/recipes";
  const method = mode === "edit" ? "PUT" : "POST";
  return await apiFetch<{ recipeid?: string | number }>(endpoint, method, formData);
}

export default {
  fetchRecipes,
  fetchRecipeById,
  saveRecipeRequest
};
