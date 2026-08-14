import { authGuard } from "../../middleware/middleware.js";

export const farmsRoutes = [
  // Static Routes
  {
    path: "/dash",
    component: () => import("../../pages/dash/dash.js"),
    functionName: "Dash",
    middleware: [authGuard]
  },
  {
    path: "/farms",
    component: () => import("../../pages/farm/farms.js"),
    functionName: "Farms"
  },
  {
    path: "/create-farm",
    component: () => import("../../pages/farm/createNewFarm.js"),
    functionName: "CreateFarm",
    middleware: [authGuard]
  },
  {
    path: "/tools",
    component: () => import("../../pages/farm/tools.js"),
    functionName: "Tools"
  },
  {
    path: "/products",
    component: () => import("../../pages/farm/products.js"),
    functionName: "Products"
  },
  {
    path: "/crops",
    component: () => import("../../pages/crop/crops.js"),
    functionName: "Crops"
  },
  {
    path: "/bazarbhav",
    component: () => import("../../pages/crop/bazaar.js"),
    functionName: "BazaarBhav"
  },
  {
    path: "/grocery",
    component: () => import("../../pages/crop/crops.js"),
    functionName: "Crops"
  },
  {
    path: "/recipes",
    component: () => import("../../pages/recipe/recipes.js"),
    functionName: "Recipes"
  },
  {
    path: "/create-recipe",
    component: () => import("../../pages/recipe/createNewRecipe.js"),
    functionName: "CreateRecipe"
  },

  // Dynamic Routes
  {
    path: "/products/:type/:id",
    component: () => import("../../pages/product/product.js"),
    functionName: "Product"
  },
  {
    path: "/crop/:id",
    component: () => import("../../pages/crop/cropPage.js"),
    functionName: "Crop"
  },
  {
    path: "/aboutcrop/:id",
    component: () => import("../../pages/crop/aboutCropPage.js"),
    functionName: "AboutCrop"
  },
  {
    path: "/farm/:id",
    component: () => import("../../pages/crop/displayFarm.js"),
    functionName: "Farm"
  },
  {
    path: "/recipe/:id",
    component: () => import("../../pages/recipe/recipePage.js"),
    functionName: "Recipe"
  }
];