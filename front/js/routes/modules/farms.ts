import { AppRoute } from "./routeTypes.js";

export const farmsRoutes: AppRoute[] = [
  /* =======================================================
     DASHBOARD
  ======================================================= */

  {
    path: "/dash",
    component: () =>
      import(
        "../../pages/dash/dash.js"
      ),
    functionName: "Dash",
    meta: {
      requiresAuth: true,
      title: "Dashboard"
    }
  },

  /* =======================================================
     FARMS
  ======================================================= */

  {
    path: "/farms",
    component: () =>
      import(
        "../../pages/farm/farms.js"
      ),
    functionName: "Farms",
    meta: {
      title: "Farms"
    }
  },

  {
    path: "/create-farm",
    component: () =>
      import(
        "../../pages/farm/createNewFarm.js"
      ),
    functionName: "CreateFarm",
    meta: {
      requiresAuth: true,
      title: "Create Farm"
    }
  },

  /* =======================================================
     FARM TOOLS
  ======================================================= */

  {
    path: "/tools",
    component: () =>
      import(
        "../../pages/farm/tools.js"
      ),
    functionName: "Tools",
    meta: {
      title: "Tools"
    }
  },

  {
    path: "/products",
    component: () =>
      import(
        "../../pages/farm/products.js"
      ),
    functionName: "Products",
    meta: {
      title: "Products"
    }
  },

  {
    path: "/crops",
    component: () =>
      import(
        "../../pages/crop/crops.js"
      ),
    functionName: "Crops",
    meta: {
      title: "Crops"
    }
  },

  {
    path: "/bazarbhav",
    component: () =>
      import(
        "../../pages/crop/bazaar.js"
      ),
    functionName: "BazaarBhav",
    meta: {
      title: "Bazaar Bhav"
    }
  },

  {
    path: "/grocery",
    component: () =>
      import(
        "../../pages/crop/crops.js"
      ),
    functionName: "Crops",
    meta: {
      title: "Grocery"
    }
  },

  {
    path: "/recipes",
    component: () =>
      import(
        "../../pages/recipe/recipes.js"
      ),
    functionName: "Recipes",
    meta: {
      title: "Recipes"
    }
  },

  {
    path: "/create-recipe",
    component: () =>
      import(
        "../../pages/recipe/createNewRecipe.js"
      ),
    functionName: "CreateRecipe",
    meta: {
      requiresAuth: true,
      title: "Create Recipe"
    }
  },

  /* =======================================================
     DYNAMIC ROUTES
  ======================================================= */

  {
    path: "/products/:type/:id",
    component: () =>
      import(
        "../../pages/product/product.js"
      ),
    functionName: "Product",
    meta: {
      title: "Product"
    }
  },

  {
    path: "/crop/:id",
    component: () =>
      import(
        "../../pages/crop/cropPage.js"
      ),
    functionName: "Crop",
    meta: {
      title: "Crop"
    }
  },

  {
    path: "/aboutcrop/:id",
    component: () =>
      import(
        "../../pages/crop/aboutCropPage.js"
      ),
    functionName: "AboutCrop",
    meta: {
      title: "About Crop"
    }
  },

  {
    path: "/farm/:id",
    component: () =>
      import(
        "../../pages/crop/displayFarm.js"
      ),
    functionName: "Farm",
    meta: {
      title: "Farm"
    }
  },

  {
    path: "/recipe/:id",
    component: () =>
      import(
        "../../pages/recipe/recipePage.js"
      ),
    functionName: "Recipe",
    meta: {
      title: "Recipe"
    }
  }
];