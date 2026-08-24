export interface IngredientAlternative {
  name: string;
  itemId?: string | number;
  type?: string;
}

export interface Ingredient {
  name?: string;
  quantity?: number | string;
  unit?: string;
  itemId?: string | number;
  itemid?: string | number;
  productId?: string | number;
  productid?: string | number;
  alternatives?: IngredientAlternative[];
}

export interface RecipeStepObject {
  text: string;
  [key: string]: unknown;
}

export type RecipeStep = string | RecipeStepObject;

export interface User {
  id?: string | number;
  userid?: string | number;
  username?: string;
}

export interface Recipe {
  recipeid: string | number;
  title?: string;
  name?: string;
  description?: string;
  ingredients?: Ingredient[];
  steps?: RecipeStep[];
  cookTime?: string;
  servings?: number | string;
  cuisine?: string;
  portionSize?: string;
  season?: string;
  dietary?: string[];
  tags?: string[];
  difficulty?: "Easy" | "Medium" | "Hard" | "";
  videoUrl?: string;
  notes?: string;
  banner?: string;
  version?: string | number;
  lastUpdated?: string | number | Date;
  userid?: string | number;
  user_id?: string | number;
  username?: string;
}

export interface TabItem {
  title: string;
  id: string;
  render: (container: HTMLElement) => void;
}