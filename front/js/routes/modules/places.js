import { authGuard } from "../../middleware/middleware.js";

export const placesRoutes = [
  // Static
  {
    path: "/map",
    component: () => import("../../pages/gtamap/mapgta.js"),
    functionName: "MapGTA"
  },
  {
    path: "/places",
    component: () => import("../../pages/places/places.js"),
    functionName: "Places"
  },
  {
    path: "/create-place",
    component: () => import("../../pages/places/createPlace.js"),
    functionName: "CreatePlace",
    middleware: [authGuard]
  },
  {
    path: "/itinerary",
    component: () => import("../../pages/itinerary/itinerary.js"),
    functionName: "Itinerary"
  },
  {
    path: "/create-itinerary",
    component: () => import("../../pages/itinerary/createItinerary.js"),
    functionName: "CreateItinerary",
    middleware: [authGuard]
  },
  {
    path: "/edit-itinerary",
    component: () => import("../../pages/itinerary/editItinerary.js"),
    functionName: "EditItinerary",
    middleware: [authGuard]
  },

  // Dynamic
  {
    path: "/place/:id",
    component: () => import("../../pages/places/placePage.js"),
    functionName: "Place"
  },
  {
    path: "/itinerary/:id",
    component: () => import("../../pages/itinerary/itineraryDisplay.js"),
    functionName: "Itinerary"
  }
];