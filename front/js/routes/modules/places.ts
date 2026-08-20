export const placesRoutes = [
  /* =======================================================
     MAP & PLACES
  ======================================================= */

  {
    path: "/map",
    component: () =>
      import(
        "../../pages/gtamap/mapgta.ts"
      ),
    functionName: "MapGTA",
    meta: {
      title: "Map"
    }
  },

  {
    path: "/places",
    component: () =>
      import(
        "../../pages/places/places.ts"
      ),
    functionName: "Places",
    meta: {
      title: "Places"
    }
  },

  {
    path: "/create-place",
    component: () =>
      import(
        "../../pages/places/createPlace.ts"
      ),
    functionName: "CreatePlace",
    meta: {
      requiresAuth: true,
      title: "Create Place"
    }
  },

  /* =======================================================
     ITINERARIES
  ======================================================= */

  {
    path: "/itinerary",
    component: () =>
      import(
        "../../pages/itinerary/itinerary.ts"
      ),
    functionName: "Itinerary",
    meta: {
      title: "Itinerary"
    }
  },

  {
    path: "/create-itinerary",
    component: () =>
      import(
        "../../pages/itinerary/createItinerary.ts"
      ),
    functionName: "CreateItinerary",
    meta: {
      requiresAuth: true,
      title: "Create Itinerary"
    }
  },

  {
    path: "/edit-itinerary",
    component: () =>
      import(
        "../../pages/itinerary/editItinerary.ts"
      ),
    functionName: "EditItinerary",
    meta: {
      requiresAuth: true,
      title: "Edit Itinerary"
    }
  },

  /* =======================================================
     DYNAMIC ROUTES
  ======================================================= */

  {
    path: "/place/:id",
    component: () =>
      import(
        "../../pages/places/placePage.ts"
      ),
    functionName: "Place",
    meta: {
      title: "Place"
    }
  },

  {
    path: "/itinerary/:id",
    component: () =>
      import(
        "../../pages/itinerary/itineraryDisplay.ts"
      ),
    functionName: "Itinerary",
    meta: {
      title: "Itinerary"
    }
  }
];