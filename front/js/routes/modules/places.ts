import { AppRoute } from "./routeTypes.js";

export const placesRoutes: AppRoute[] = [
  /* =======================================================
     MAP & PLACES
  ======================================================= */

  {
    path: "/map",
    component: () =>
      import(
        "../../pages/gtamap/mapgta.js"
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
        "../../pages/places/places.js"
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
        "../../pages/places/createPlace.js"
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
        "../../pages/itinerary/itinerary.js"
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
        "../../pages/itinerary/createItinerary.js"
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
        "../../pages/itinerary/editItinerary.js"
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
        "../../pages/places/placePage.js"
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
        "../../pages/itinerary/itineraryDisplay.js"
      ),
    functionName: "Itinerary",
    meta: {
      title: "Itinerary"
    }
  }
];