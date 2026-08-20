export const farmsRoutes = [
  /* =======================================================
     DASHBOARD
  ======================================================= */

  {
    path: "/dash",
    component: () =>
      import(
        "../../pages/dash/dash.ts"
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
        "../../pages/farm/farms.ts"
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
        "../../pages/farm/createNewFarm.ts"
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
        "../../pages/farm/tools.ts"
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
        "../../pages/farm/products.ts"
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
        "../../pages/crop/crops.ts"
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
        "../../pages/crop/bazaar.ts"
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
        "../../pages/crop/crops.ts"
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
        "../../pages/recipe/recipes.ts"
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
        "../../pages/recipe/createNewRecipe.ts"
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
        "../../pages/product/product.ts"
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
        "../../pages/crop/cropPage.ts"
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
        "../../pages/crop/aboutCropPage.ts"
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
        "../../pages/crop/displayFarm.ts"
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
        "../../pages/recipe/recipePage.ts"
      ),
    functionName: "Recipe",
    meta: {
      title: "Recipe"
    }
  }
];