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

// Core / Shared Static Routes
const coreStaticRoutes = {
  "/": { moduleImport: () => import("../pages/home.js"), functionName: "Home" },
  "/home": { moduleImport: () => import("../pages/home.js"), functionName: "Home" },
  "/login": { moduleImport: () => import("../pages/auth/auth.js"), functionName: "Auth" },
  "/profile": { moduleImport: () => import("../pages/profile/userProfile.js"), functionName: "MyProfile", protected: true },
  "/settings": { moduleImport: () => import("../pages/profile/settings.js"), functionName: "Settings", protected: true },
  "/map": { moduleImport: () => import("../pages/gtamap/mapgta.js"), functionName: "MapGTA" },
  "/cart": { moduleImport: () => import("../pages/cart/cart.js"), functionName: "Cart", protected: true },
  "/my-orders": { moduleImport: () => import("../pages/cart/myorders.js"), functionName: "MyOrders", protected: true },
  "/deliveries": { moduleImport: () => import("../pages/cart/delivery.js"), functionName: "DeliveryPage" },
  "/booking": { moduleImport: () => import("../pages/booking/booking.js"), functionName: "Booking" },
  "/wallet": { moduleImport: () => import("../pages/wallet/wallet.js"), functionName: "Wallet" },
  "/search": { moduleImport: () => import("../pages/search/search.js"), functionName: "Search" },
};

// Core / Shared Dynamic Routes
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
    moduleImport: () => import("../pages/cart/displayDelivery.js"),
    functionName: "Delivery",
    protected: false,
    argBuilder: safeArgBuilder
  }
];

// Combine all Static Routes
export const staticRoutes = Object.assign(
  {},
  coreStaticRoutes,
  adminStaticRoutes,
  palcesStaticRoutes,
  farmsStaticRoutes,
  eventsStaticRoutes,
  baitoStaticRoutes,
  socialStaticRoutes,
  chatsStaticRoutes
);

// Combine all Dynamic Routes
export const dynamicRoutes = [
  ...coreDynamicRoutes,
  ...adminDynamicRoutes,
  ...placesDynamicRoutes,
  ...farmsDynamicRoutes,
  ...eventsDynamicRoutes,
  ...baitoDynamicRoutes,
  ...socialDynamicRoutes,
  ...chatsDynamicRoutes
];