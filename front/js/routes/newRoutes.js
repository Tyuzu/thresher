import { getCurrentAllowedFeatures } from "../config/domainFeatures.js";
import { adminStaticRoutes, adminDynamicRoutes } from "./modules/admin.js";
import { farmsStaticRoutes, farmsDynamicRoutes } from "./modules/farms.js";
import { eventsStaticRoutes, eventsDynamicRoutes } from "./modules/events.js";
import { baitoStaticRoutes, baitoDynamicRoutes } from "./modules/baito.js";
import { socialStaticRoutes, socialDynamicRoutes } from "./modules/social.js";
import { chatsStaticRoutes, chatsDynamicRoutes } from "./modules/chats.js";
import { palcesStaticRoutes, placesDynamicRoutes } from "./modules/places.js";

export function safeArgBuilder(match) {
  if (!match) return [];
  return match.slice(1).filter(val => val !== undefined);
}

// Core / Shared Static Routes (Available across ALL domains)
const coreStaticRoutes = {
  "/": { moduleImport: () => import("../pages/home.js"), functionName: "Home" },
  "/home": { moduleImport: () => import("../pages/home.js"), functionName: "Home" },
  "/login": { moduleImport: () => import("../pages/auth/auth.js"), functionName: "Auth" },
  "/profile": { moduleImport: () => import("../pages/profile/userProfile.js"), functionName: "MyProfile", protected: true },
  "/settings": { moduleImport: () => import("../pages/profile/settings.js"), functionName: "Settings", protected: true },
  "/map": { moduleImport: () => import("../pages/gtamap/mapgta.js"), functionName: "MapGTA" },
  "/cart": { moduleImport: () => import("../pages/cart/cart.js"), functionName: "Cart", protected: true },
  "/my-orders": { moduleImport: () => import("../pages/cart/myorders.js"), functionName: "MyOrders", protected: true },
  "/deliveries": { moduleImport: () => import("../pages/delivery/deliveries.js"), functionName: "Deliveries", protected: true },
  "/delivery/create": { moduleImport: () => import("../pages/delivery/createDelivery.js"), functionName: "Createdelivery", protected: true },
  "/booking": { moduleImport: () => import("../pages/booking/booking.js"), functionName: "Booking" },
  "/wallet": { moduleImport: () => import("../pages/wallet/wallet.js"), functionName: "Wallet" },
  "/search": { moduleImport: () => import("../pages/search/search.js"), functionName: "Search" },
};

// Core / Shared Dynamic Routes (Available across ALL domains)
const coreDynamicRoutes = [
  {
    pattern: /^\/user\/([\w-]+)$/,
    moduleImport: () => import("../pages/profile/userProfile.js"),
    functionName: "UserProfile",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/delivery\/([\w-]+)$/,
    moduleImport: () => import("../pages/delivery/displayDelivery.js"),
    functionName: "Delivery",
    protected: false,
    argBuilder: (match, state) => [state?.isLoggedIn, match[1]]
  },
];

// Map feature keys to their respective static and dynamic routes
const featureModules = {
  admin: { static: adminStaticRoutes, dynamic: adminDynamicRoutes },
  places: { static: palcesStaticRoutes, dynamic: placesDynamicRoutes },
  farms: { static: farmsStaticRoutes, dynamic: farmsDynamicRoutes },
  events: { static: eventsStaticRoutes, dynamic: eventsDynamicRoutes },
  baito: { static: baitoStaticRoutes, dynamic: baitoDynamicRoutes },
  social: { static: socialStaticRoutes, dynamic: socialDynamicRoutes },
  chats: { static: chatsStaticRoutes, dynamic: chatsDynamicRoutes },
};

// Build routes conditionally based on domain permissions
function buildDomainRoutes() {
  const allowedFeatures = getCurrentAllowedFeatures();

  const finalStatic = { ...coreStaticRoutes };
  const finalDynamic = [...coreDynamicRoutes];

  Object.entries(featureModules).forEach(([featureKey, module]) => {
    // Include the feature routes if "ALL" is allowed or if the current domain permits this feature
    if (allowedFeatures.includes("ALL") || allowedFeatures.includes(featureKey)) {
      Object.assign(finalStatic, module.static);
      finalDynamic.push(...module.dynamic);
    }
  });

  return { finalStatic, finalDynamic };
}

const { finalStatic, finalDynamic } = buildDomainRoutes();

export const staticRoutes = finalStatic;
export const dynamicRoutes = finalDynamic;