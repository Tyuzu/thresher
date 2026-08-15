import {
  getCurrentAllowedFeatures
} from "../config/domainFeatures.js";

import {
  metaGuard
} from "../middleware/middleware.js";

/* =========================================================
   FEATURE ROUTES
========================================================= */

import {
  adminRoutes
} from "./modules/admin.js";

import {
  farmsRoutes
} from "./modules/farms.js";

import {
  eventsRoutes
} from "./modules/events.js";

import {
  baitoRoutes
} from "./modules/baito.js";

import {
  socialRoutes
} from "./modules/social.js";

import {
  chatsRoutes
} from "./modules/chats.js";

import {
  placesRoutes
} from "./modules/places.js";

/* =========================================================
   CORE ROUTES
========================================================= */

const coreRoutes = [
  {
    path: "/",
    component: () =>
      import("../pages/home.js"),
    functionName: "Home",
    meta: {
      title: "Home"
    }
  },

  {
    path: "/home",
    component: () =>
      import("../pages/home.js"),
    functionName: "Home",
    meta: {
      title: "Home"
    }
  },

  {
    path: "/login",
    component: () =>
      import("../pages/auth/auth.js"),
    functionName: "Auth",
    meta: {
      guestOnly: true,
      title: "Login"
    }
  },

  {
    path: "/profile",
    component: () =>
      import("../pages/profile/userProfile.js"),
    functionName: "MyProfile",
    meta: {
      requiresAuth: true,
      title: "My Profile"
    }
  },

  {
    path: "/user/:id",
    component: () =>
      import("../pages/profile/userProfile.js"),
    functionName: "UserProfile",
    meta: {
      title: "User Profile"
    }
  },

  {
    path: "/settings",
    component: () =>
      import("../pages/profile/settings.js"),
    functionName: "Settings",
    meta: {
      requiresAuth: true,
      title: "Account Settings"
    }
  },

  {
    path: "/map",
    component: () =>
      import("../pages/gtamap/mapgta.js"),
    functionName: "MapGTA",
    meta: {
      title: "Map"
    }
  },

  {
    path: "/cart",
    component: () =>
      import("../pages/cart/cart.js"),
    functionName: "Cart",
    meta: {
      requiresAuth: true,
      title: "Shopping Cart"
    }
  },

  {
    path: "/my-orders",
    component: () =>
      import("../pages/cart/myorders.js"),
    functionName: "MyOrders",
    meta: {
      requiresAuth: true,
      title: "My Orders"
    }
  },

  {
    path: "/deliveries",
    component: () =>
      import("../pages/delivery/deliveries.js"),
    functionName: "Deliveries",
    meta: {
      requiresAuth: true,
      title: "Deliveries"
    }
  },

  {
    path: "/delivery/create",
    component: () =>
      import("../pages/delivery/createDelivery.js"),
    functionName: "Createdelivery",
    meta: {
      requiresAuth: true,
      title: "Create Delivery"
    }
  },

  {
    path: "/delivery/track/:id",
    component: () =>
      import("../pages/delivery/trackDelivery.js"),
    functionName: "TrackDelivery",
    meta: {
      requiresAuth: true,
      title: "Track Delivery"
    }
  },

  {
    path: "/delivery/:id",
    component: () =>
      import("../pages/delivery/displayDelivery.js"),
    functionName: "Delivery",
    meta: {
      requiresAuth: true,
      title: "Delivery"
    }
  },

  {
    path: "/dash/driver",
    component: () =>
      import("../pages/delivery/driverDash.js"),
    functionName: "DriverDash",
    meta: {
      requiresAuth: true,
      roles: [
        "driver",
        "admin"
      ],
      title: "Driver Dashboard"
    }
  },

  {
    path: "/wallet",
    component: () =>
      import("../pages/wallet/wallet.js"),
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
      import("../legalPages/home.js"),
    functionName: "About",
    meta: {
      title: "About Us"
    }
  },

  {
    path: "/contact",
    component: () =>
      import("../legalPages/home.js"),
    functionName: "Contact",
    meta: {
      title: "Contact Us"
    }
  },

  {
    path: "/faq",
    component: () =>
      import("../legalPages/home.js"),
    functionName: "Faq",
    meta: {
      title: "FAQ"
    }
  },

  {
    path: "/terms",
    component: () =>
      import("../legalPages/home.js"),
    functionName: "Terms",
    meta: {
      title: "Terms of Service"
    }
  },

  {
    path: "/privacy",
    component: () =>
      import("../legalPages/home.js"),
    functionName: "Privacy",
    meta: {
      title: "Privacy Policy"
    }
  },

  {
    path: "/refund",
    component: () =>
      import("../legalPages/home.js"),
    functionName: "Refund",
    meta: {
      title: "Refund Policy"
    }
  },

  {
    path: "/shipping",
    component: () =>
      import("../legalPages/home.js"),
    functionName: "Shipping",
    meta: {
      title: "Shipping Information"
    }
  },

  {
    path: "/returns",
    component: () =>
      import("../legalPages/home.js"),
    functionName: "Returns",
    meta: {
      title: "Returns Policy"
    }
  },

  {
    path: "/disclaimer",
    component: () =>
      import("../legalPages/home.js"),
    functionName: "Disclaimer",
    meta: {
      title: "Disclaimer"
    }
  },

  {
    path: "/blog",
    component: () =>
      import("../legalPages/home.js"),
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
      import("../pages/errors/error.js"),
    functionName: "NotFound",
    meta: {
      title: "Page Not Found"
    }
  },

  {
    path: "/error/404",
    component: () =>
      import("../pages/errors/error.js"),
    functionName: "NotFound",
    meta: {
      title: "Page Not Found"
    }
  },

  {
    path: "/403",
    component: () =>
      import("../pages/errors/error.js"),
    functionName: "Forbidden",
    meta: {
      title: "Access Denied"
    }
  },

  {
    path: "/error/403",
    component: () =>
      import("../pages/errors/error.js"),
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
  const path =
    String(route.path || "");

  const segments =
    path
      .split("/")
      .filter(Boolean);

  let score = 0;

  for (const segment of segments) {
    if (segment.startsWith("*")) {
      score += 1;
    } else if (
      segment.startsWith(":")
    ) {
      score += 10;
    } else {
      score += 100;
    }
  }

  /*
   * Longer route patterns generally represent
   * more specific matches.
   */
  score += segments.length;

  return score;
}

/* =========================================================
   BUILD ROUTES
========================================================= */

function buildRoutes() {
  const allowedFeatures =
    getCurrentAllowedFeatures();

  const aggregatedRoutes = [
    ...coreRoutes,
    ...legalRoutes,
    ...errorRoutes
  ];

  Object.entries(
    featureModules
  ).forEach(
    ([featureKey, routesList]) => {
      const enabled =
        allowedFeatures.includes(
          "ALL"
        ) ||
        allowedFeatures.includes(
          featureKey
        );

      if (
        enabled &&
        Array.isArray(routesList)
      ) {
        aggregatedRoutes.push(
          ...routesList
        );
      }
    }
  );

  if (
    allowedFeatures.includes(
      "ALL"
    ) ||
    allowedFeatures.includes(
      "admin"
    )
  ) {
    aggregatedRoutes.push({
      path: "/admin/*path",
      component: () =>
        import(
          "../pages/admin/dashboard.js"
        ),
      functionName:
        "AdminDashboard",
      meta: {
        requiresAuth: true,
        roles: ["admin"],
        title: "Admin Portal"
      }
    });
  }

  /*
   * Metadata guard is the common first pipeline
   * for every route.
   */
  const withMiddleware =
    aggregatedRoutes.map(
      (route) => ({
        ...route,
        middleware: [
          metaGuard,
          ...(route.middleware || [])
        ]
      })
    );

  /*
   * More specific routes must be tested before
   * generic dynamic/wildcard routes.
   *
   * Stable sort preserves declaration order
   * among equally specific routes.
   */
  return withMiddleware.sort(
    (a, b) =>
      routeSpecificity(b) -
      routeSpecificity(a)
  );
}

export const routes =
  buildRoutes();