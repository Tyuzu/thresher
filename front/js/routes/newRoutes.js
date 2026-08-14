import { getCurrentAllowedFeatures } from "../config/domainFeatures.js";
import { authGuard, guestGuard, roleGuard } from "../middleware/middleware.js";

// Feature module imports
import { adminRoutes } from "./modules/admin.js";
import { farmsRoutes } from "./modules/farms.js";
import { eventsRoutes } from "./modules/events.js";
import { baitoRoutes } from "./modules/baito.js";
import { socialRoutes } from "./modules/social.js";
import { chatsRoutes } from "./modules/chats.js";
import { placesRoutes } from "./modules/places.js";

// Core routes accessible across all deployments
const coreRoutes = [
  { path: "/", component: () => import("../pages/home.js"), functionName: "Home" },
  { path: "/home", component: () => import("../pages/home.js"), functionName: "Home" },
  {
    path: "/login",
    component: () => import("../pages/auth/auth.js"),
    functionName: "Auth",
    middleware: [guestGuard]
  },
  {
    path: "/profile",
    component: () => import("../pages/profile/userProfile.js"),
    functionName: "MyProfile",
    middleware: [authGuard]
  },
  {
    path: "/user/:id",
    component: () => import("../pages/profile/userProfile.js"),
    functionName: "UserProfile"
  },
  {
    path: "/settings",
    component: () => import("../pages/profile/settings.js"),
    functionName: "Settings",
    middleware: [authGuard]
  },
  { path: "/map", component: () => import("../pages/gtamap/mapgta.js"), functionName: "MapGTA" },
  {
    path: "/cart",
    component: () => import("../pages/cart/cart.js"),
    functionName: "Cart",
    middleware: [authGuard]
  },
  {
    path: "/my-orders",
    component: () => import("../pages/cart/myorders.js"),
    functionName: "MyOrders",
    middleware: [authGuard]
  },
  {
    path: "/deliveries",
    component: () => import("../pages/delivery/deliveries.js"),
    functionName: "Deliveries",
    middleware: [authGuard]
  },
  {
    path: "/delivery/create",
    component: () => import("../pages/delivery/createDelivery.js"),
    functionName: "Createdelivery",
    middleware: [authGuard]
  },
  {
    path: "/delivery/:id",
    component: () => import("../pages/delivery/displayDelivery.js"),
    functionName: "Delivery"
  },
  {
    path: "/delivery/track/:id",
    component: () => import("../pages/delivery/trackDelivery.js"),
    functionName: "TrackDelivery"
  },
  {
    path: "/dash/driver",
    component: () => import("../pages/delivery/driverDash.js"),
    functionName: "DriverDash",
    middleware: [authGuard, roleGuard(["driver", "admin"])]
  },
  { path: "/wallet", component: () => import("../pages/wallet/wallet.js"), functionName: "Wallet" }
];

// Legal static pages
const legalRoutes = [
  { path: "/about", component: () => import("../legalPages/home.js"), functionName: "About" },
  { path: "/contact", component: () => import("../legalPages/home.js"), functionName: "Contact" },
  { path: "/faq", component: () => import("../legalPages/home.js"), functionName: "Faq" },
  { path: "/terms", component: () => import("../legalPages/home.js"), functionName: "Terms" },
  { path: "/privacy", component: () => import("../legalPages/home.js"), functionName: "Privacy" },
  { path: "/refund", component: () => import("../legalPages/home.js"), functionName: "Refund" },
  { path: "/shipping", component: () => import("../legalPages/home.js"), functionName: "Shipping" },
  { path: "/returns", component: () => import("../legalPages/home.js"), functionName: "Returns" },
  { path: "/disclaimer", component: () => import("../legalPages/home.js"), functionName: "Disclaimer" },
  { path: "/blog", component: () => import("../legalPages/home.js"), functionName: "Blog" }
];

// Mapping feature keys to their respective module route arrays
const featureModules = {
  admin: adminRoutes,
  farms: farmsRoutes,
  events: eventsRoutes,
  baito: baitoRoutes,
  social: socialRoutes,
  chats: chatsRoutes,
  places: placesRoutes
};

function buildRoutes() {
  const allowedFeatures = getCurrentAllowedFeatures();
  const aggregatedRoutes = [...coreRoutes, ...legalRoutes];

  // Dynamically attach feature modules based on domain permission configuration
  Object.entries(featureModules).forEach(([featureKey, routesList]) => {
    if ((allowedFeatures.includes("ALL") || allowedFeatures.includes(featureKey)) && Array.isArray(routesList)) {
      aggregatedRoutes.push(...routesList);
    }
  });

  // Catch-all admin fallback route
  if (allowedFeatures.includes("ALL") || allowedFeatures.includes("admin")) {
    aggregatedRoutes.push({
      path: "/admin/*path",
      component: () => import("../pages/admin/dashboard.js"),
      functionName: "AdminDashboard",
      middleware: [authGuard, roleGuard(["admin"])]
    });
  }

  return aggregatedRoutes;
}

export const routes = buildRoutes();