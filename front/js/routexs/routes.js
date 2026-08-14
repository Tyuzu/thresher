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
  return match.slice(1).filter((val) => val !== undefined);
}

// Shared static routes
export const staticRoutes = {
  "/": { 
    moduleImport: () => import("../pages/home.js"), 
    functionName: "Home" 
  },
  "/home": { 
    moduleImport: () => import("../pages/home.js"), 
    functionName: "Home" 
  },
  "/login": { 
    moduleImport: () => import("../pages/auth/auth.js"), 
    functionName: "Auth",
    meta: { guestOnly: true }
  },
  "/profile": { 
    moduleImport: () => import("../pages/profile/userProfile.js"), 
    functionName: "MyProfile", 
    meta: { requiresAuth: true } 
  },
  "/settings": { 
    moduleImport: () => import("../pages/profile/settings.js"), 
    functionName: "Settings", 
    meta: { requiresAuth: true } 
  },
  "/map": { 
    moduleImport: () => import("../pages/gtamap/mapgta.js"), 
    functionName: "MapGTA" 
  },
  "/cart": { 
    moduleImport: () => import("../pages/cart/cart.js"), 
    functionName: "Cart", 
    meta: { requiresAuth: true } 
  },
  "/my-orders": { 
    moduleImport: () => import("../pages/cart/myorders.js"), 
    functionName: "MyOrders", 
    meta: { requiresAuth: true } 
  },
  "/deliveries": { 
    moduleImport: () => import("../pages/delivery/deliveries.js"), 
    functionName: "Deliveries", 
    meta: { requiresAuth: true } 
  },
  "/delivery/create": { 
    moduleImport: () => import("../pages/delivery/createDelivery.js"), 
    functionName: "Createdelivery", 
    meta: { requiresAuth: true } 
  },
  "/dash/driver": { 
    moduleImport: () => import("../pages/delivery/driverDash.js"), 
    functionName: "DriverDash", 
    meta: { requiresAuth: true, roles: ["driver", "admin"] } 
  },
  "/wallet": { 
    moduleImport: () => import("../pages/wallet/wallet.js"), 
    functionName: "Wallet" 
  },
};

// Merge domain-specific routes based on feature flags
const allowedFeatures = getCurrentAllowedFeatures() || [];

if (allowedFeatures.includes("admin")) Object.assign(staticRoutes, adminStaticRoutes);
if (allowedFeatures.includes("farms")) Object.assign(staticRoutes, farmsStaticRoutes);
if (allowedFeatures.includes("events")) Object.assign(staticRoutes, eventsStaticRoutes);
if (allowedFeatures.includes("baito")) Object.assign(staticRoutes, baitoStaticRoutes);
if (allowedFeatures.includes("social")) Object.assign(staticRoutes, socialStaticRoutes);
if (allowedFeatures.includes("chats")) Object.assign(staticRoutes, chatsStaticRoutes);
if (allowedFeatures.includes("places")) Object.assign(staticRoutes, palcesStaticRoutes);

export const dynamicRoutes = [
  ...(allowedFeatures.includes("admin") ? adminDynamicRoutes : []),
  ...(allowedFeatures.includes("farms") ? farmsDynamicRoutes : []),
  ...(allowedFeatures.includes("events") ? eventsDynamicRoutes : []),
  ...(allowedFeatures.includes("baito") ? baitoDynamicRoutes : []),
  ...(allowedFeatures.includes("social") ? socialDynamicRoutes : []),
  ...(allowedFeatures.includes("chats") ? chatsDynamicRoutes : []),
  ...(allowedFeatures.includes("places") ? placesDynamicRoutes : []),
];