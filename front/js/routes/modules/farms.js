import { safeArgBuilder } from "../safeArgsBuilder.js";
export const farmsStaticRoutes = {
  "/dash": { moduleImport: () => import("../../pages/dash/dash.js"), functionName: "Dash", protected: true },
  "/farms": { moduleImport: () => import("../../pages/farm/farms.js"), functionName: "Farms" },
  "/create-farm": { moduleImport: () => import("../../pages/farm/createNewFarm.js"), functionName: "CreateFarm", protected: true },
  "/tools": { moduleImport: () => import("../../pages/farm/tools.js"), functionName: "Tools" },
  "/products": { moduleImport: () => import("../../pages/farm/products.js"), functionName: "Products" },
  "/crops": { moduleImport: () => import("../../pages/crop/crops.js"), functionName: "Crops" },
  "/bazarbhav": { moduleImport: () => import("../../pages/crop/bazaar.js"), functionName: "BazaarBhav" },
  "/grocery": { moduleImport: () => import("../../pages/crop/crops.js"), functionName: "Crops" },
  "/recipes": { moduleImport: () => import("../../pages/recipe/recipes.js"), functionName: "Recipes" },
  "/create-recipe": { moduleImport: () => import("../../pages/recipe/createNewRecipe.js"), functionName: "CreateRecipe" },
};

export const farmsDynamicRoutes = [
  {
    // Capture group 1: product|tool type, Capture group 2: productId
    pattern: /^\/products\/(product|tool)\/([\w-]+)$/,
    moduleImport: () => import("../../pages/product/product.js"),
    functionName: "Product",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/crop\/([\w-]+)$/,
    moduleImport: () => import("../../pages/crop/cropPage.js"),
    functionName: "Crop",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/aboutcrop\/([\w-]+)$/,
    moduleImport: () => import("../../pages/crop/aboutCropPage.js"),
    functionName: "AboutCrop",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/farm\/([\w-]+)$/,
    moduleImport: () => import("../../pages/crop/displayFarm.js"),
    functionName: "Farm",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/recipe\/([\w-]+)$/,
    moduleImport: () => import("../../pages/recipe/recipePage.js"),
    functionName: "Recipe",
    protected: false,
    argBuilder: safeArgBuilder
  }
];