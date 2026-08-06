import { safeArgBuilder } from "../safeArgsBuilder.js";
export const palcesStaticRoutes = {
  "/map": { moduleImport: () => import("../../pages/gtamap/mapgta.js"), functionName: "MapGTA" },
  "/places": { moduleImport: () => import("../../pages/places/places.js"), functionName: "Places" },
  "/create-place": { moduleImport: () => import("../../pages/places/createPlace.js"), functionName: "CreatePlace", protected: true },

  "/itinerary": { moduleImport: () => import("../../pages/itinerary/itinerary.js"), functionName: "Itinerary" },
  "/create-itinerary": { moduleImport: () => import("../../pages/itinerary/createItinerary.js"), functionName: "CreateItinerary", protected: true },
  "/edit-itinerary": { moduleImport: () => import("../../pages/itinerary/editItinerary.js"), functionName: "EditItinerary", protected: true },
};

export const placesDynamicRoutes = [
  {
    pattern: /^\/place\/([\w-]+)$/,
    moduleImport: () => import("../../pages/places/placePage.js"),
    functionName: "Place",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/itinerary\/([\w-]+)$/,
    moduleImport: () => import("../../pages/itinerary/itineraryDisplay.js"),
    functionName: "Itinerary",
    protected: false,
    argBuilder: safeArgBuilder
  },
];