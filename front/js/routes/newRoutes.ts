import {
  getCurrentAllowedFeatures
} from "../config/domainFeatures.ts";

import {
  metaGuard,
  authGuard,
  guestGuard,
  roleGuard,
  permissionGuard,
  onboardingGuard,
  featureFlagGuard,
  unsavedChangesGuard,
  titleGuard,
  analyticsGuard
} from "../middleware/middleware.ts";

/* =========================================================
   FEATURE ROUTES
========================================================= */

import {
  adminRoutes
} from "./modules/admin.ts";

import {
  farmsRoutes
} from "./modules/farms.ts";

import {
  eventsRoutes
} from "./modules/events.ts";

import {
  baitoRoutes
} from "./modules/baito.ts";

import {
  socialRoutes
} from "./modules/social.ts";

import {
  chatsRoutes
} from "./modules/chats.ts";

import {
  placesRoutes
} from "./modules/places.ts";

/* =========================================================
   CORE ROUTES
========================================================= */

const coreRoutes = [
  {
    path: "/",
    component: () =>
      import("../pages/home.ts"),
    functionName: "Home",
    meta: {
      title: "Home"
    }
  },

  {
    path: "/home",
    component: () =>
      import("../pages/home.ts"),
    functionName: "Home",
    meta: {
      title: "Home"
    }
  },

  {
    path: "/login",
    component: () =>
      import("../pages/auth/auth.ts"),
    functionName: "Auth",
    meta: {
      guestOnly: true,
      title: "Login"
    }
  },

  {
    path: "/profile",
    component: () =>
      import("../pages/profile/userProfile.ts"),
    functionName: "MyProfile",
    meta: {
      requiresAuth: true,
      title: "My Profile"
    }
  },

  {
    path: "/user/:id",
    component: () =>
      import("../pages/profile/userProfile.ts"),
    functionName: "UserProfile",
    meta: {
      title: "User Profile"
    }
  },

  {
    path: "/settings",
    component: () =>
      import("../pages/profile/settings.ts"),
    functionName: "Settings",
    meta: {
      requiresAuth: true,
      title: "Account Settings"
    }
  },

  {
    path: "/map",
    component: () =>
      import("../pages/gtamap/mapgta.ts"),
    functionName: "MapGTA",
    meta: {
      title: "Map"
    }
  },

  {
    path: "/cart",
    component: () =>
      import("../pages/cart/cart.ts"),
    functionName: "Cart",
    meta: {
      requiresAuth: true,
      title: "Shopping Cart"
    }
  },

  {
    path: "/my-orders",
    component: () =>
      import("../pages/cart/myorders.ts"),
    functionName: "MyOrders",
    meta: {
      requiresAuth: true,
      title: "My Orders"
    }
  },

  {
    path: "/deliveries",
    component: () =>
      import("../pages/delivery/deliveries.ts"),
    functionName: "Deliveries",
    meta: {
      requiresAuth: true,
      title: "Deliveries"
    }
  },

  {
    path: "/delivery/create",
    component: () =>
      import("../pages/delivery/createDelivery.ts"),
    functionName: "Createdelivery",
    meta: {
      requiresAuth: true,
      title: "Create Delivery"
    }
  },

  {
    path: "/delivery/track/:id",
    component: () =>
      import("../pages/delivery/trackDelivery.ts"),
    functionName: "TrackDelivery",
    meta: {
      requiresAuth: true,
      title: "Track Delivery"
    }
  },

  {
    path: "/delivery/:id",
    component: () =>
      import("../pages/delivery/displayDelivery.ts"),
    functionName: "Delivery",
    meta: {
      requiresAuth: true,
      title: "Delivery"
    }
  },

  {
    path: "/dash/driver",
    component: () =>
      import("../pages/delivery/driverDash.ts"),
    functionName: "DriverDash",
    meta: {
      requiresAuth: true,
      roles: ["driver", "admin"],
      roleMatchMode: "ANY",
      title: "Driver Dashboard"
    }
  },

  {
    path: "/wallet",
    component: () =>
      import("../pages/wallet/wallet.ts"),
    functionName: "Wallet",
    meta: {
      requiresAuth: true,
      title: "Wallet"
    }
  }
];

/* =========================================================
   LEGAL ROUTES
========================================================= */

const legalRoutes = [
  {
    path: "/about",
    component: () =>
      import("../legalPages/home.ts"),
    functionName: "About",
    meta: {
      title: "About Us"
    }
  },

  {
    path: "/contact",
    component: () =>
      import("../legalPages/home.ts"),
    functionName: "Contact",
    meta: {
      title: "Contact Us"
    }
  },

  {
    path: "/faq",
    component: () =>
      import("../legalPages/home.ts"),
    functionName: "Faq",
    meta: {
      title: "FAQ"
    }
  },

  {
    path: "/terms",
    component: () =>
      import("../legalPages/home.ts"),
    functionName: "Terms",
    meta: {
      title: "Terms of Service"
    }
  },

  {
    path: "/privacy",
    component: () =>
      import("../legalPages/home.ts"),
    functionName: "Privacy",
    meta: {
      title: "Privacy Policy"
    }
  },

  {
    path: "/refund",
    component: () =>
      import("../legalPages/home.ts"),
    functionName: "Refund",
    meta: {
      title: "Refund Policy"
    }
  },

  {
    path: "/shipping",
    component: () =>
      import("../legalPages/home.ts"),
    functionName: "Shipping",
    meta: {
      title: "Shipping Information"
    }
  },

  {
    path: "/returns",
    component: () =>
      import("../legalPages/home.ts"),
    functionName: "Returns",
    meta: {
      title: "Returns Policy"
    }
  },

  {
    path: "/disclaimer",
    component: () =>
      import("../legalPages/home.ts"),
    functionName: "Disclaimer",
    meta: {
      title: "Disclaimer"
    }
  },

  {
    path: "/blog",
    component: () =>
      import("../legalPages/home.ts"),
    functionName: "Blog",
    meta: {
      title: "Blog"
    }
  }
];

/* =========================================================
   ERROR ROUTES
========================================================= */

const errorRoutes = [
  {
    path: "/404",
    component: () =>
      import("../pages/errors/error.ts"),
    functionName: "NotFound",
    meta: {
      title: "Page Not Found"
    }
  },

  {
    path: "/error/404",
    component: () =>
      import("../pages/errors/error.ts"),
    functionName: "NotFound",
    meta: {
      title: "Page Not Found"
    }
  },

  {
    path: "/403",
    component: () =>
      import("../pages/errors/error.ts"),
    functionName: "Forbidden",
    meta: {
      title: "Access Denied"
    }
  },

  {
    path: "/error/403",
    component: () =>
      import("../pages/errors/error.ts"),
    functionName: "Forbidden",
    meta: {
      title: "Access Denied"
    }
  }
];

/* =========================================================
   FEATURE MODULES
========================================================= */

const featureModules = {
  admin: adminRoutes,
  farms: farmsRoutes,
  events: eventsRoutes,
  baito: baitoRoutes,
  social: socialRoutes,
  chats: chatsRoutes,
  places: placesRoutes
};

/* =========================================================
   ROUTE SPECIFICITY
========================================================= */

function routeSpecificity(route) {
  const path = String(route.path || "");
  const segments = path.split("/").filter(Boolean);

  let score = 0;

  for (const segment of segments) {
    if (segment.startsWith("*")) {
      score += 1;
    } else if (segment.startsWith(":")) {
      score += 10;
    } else {
      score += 100;
    }
  }

  score += segments.length;
  return score;
}

/* =========================================================
   BUILD ROUTES
========================================================= */

function buildRoutes() {
  const allowedFeatures = getCurrentAllowedFeatures();

  const aggregatedRoutes = [
    ...coreRoutes,
    ...legalRoutes,
    ...errorRoutes
  ];

  Object.entries(featureModules).forEach(([featureKey, routesList]) => {
    const enabled =
      allowedFeatures.includes("ALL") ||
      allowedFeatures.includes(featureKey);

    if (enabled && Array.isArray(routesList)) {
      aggregatedRoutes.push(...routesList);
    }
  });

  if (
    allowedFeatures.includes("ALL") ||
    allowedFeatures.includes("admin")
  ) {
    aggregatedRoutes.push({
      path: "/admin/*path",
      component: () =>
        import("../pages/admin/dashboard.ts"),
      functionName: "AdminDashboard",
      meta: {
        requiresAuth: true,
        roles: ["admin"],
        title: "Admin Portal"
      }
    });
  }

  /*
   * Attach middleware stack.
   * Uses metaGuard as the root orchestrator for declaring declarative route rules,
   * while allowing custom route-level guards to be appended if present.
   */
  const withMiddleware = aggregatedRoutes.map((route) => ({
    ...route,
    middleware: [
      metaGuard,
      ...(route.middleware || [])
    ]
  }));

  /*
   * Sort by route specificity (more specific patterns match first).
   */
  return withMiddleware.sort(
    (a, b) => routeSpecificity(b) - routeSpecificity(a)
  );
}

export const routes = buildRoutes();

// Export granular middleware helpers for standalone usage if needed
export {
  metaGuard,
  authGuard,
  guestGuard,
  roleGuard,
  permissionGuard,
  onboardingGuard,
  featureFlagGuard,
  unsavedChangesGuard,
  titleGuard,
  analyticsGuard
};