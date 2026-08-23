import { AppRoute } from "./routeTypes.js";



export const baitoRoutes: AppRoute[] = [
  /* =======================================================
     BAITO
  ======================================================= */

  {
    path: "/baitos",
    component: () =>
      import(
        "../../pages/baitos/baitos.js"
      ),
    functionName: "Baitos",
    meta: {
      title: "Baitos"
    }
  },

  {
    path: "/baitos/dash",
    component: () =>
      import(
        "../../pages/baitos/baitoDash.js"
      ),
    functionName: "BaitoDash",
    meta: {
      requiresAuth: true,
      title: "Baito Dashboard"
    }
  },

  {
    path: "/baitos/hire",
    component: () =>
      import(
        "../../pages/baitos/hireWorkers.js"
      ),
    functionName: "HireWorkers",
    meta: {
      title: "Hire Workers"
    }
  },

  {
    path: "/baitos/create-profile",
    component: () =>
      import(
        "../../pages/baitos/createProfile.js"
      ),
    functionName: "CreateBaitoProfile",
    meta: {
      requiresAuth: true,
      title: "Create Baito Profile"
    }
  },

  {
    path: "/create-baito",
    component: () =>
      import(
        "../../pages/baitos/createNewBaito.js"
      ),
    functionName: "CreateBaito",
    meta: {
      requiresAuth: true,
      title: "Create Baito"
    }
  },

  /* =======================================================
     BOOKINGS
  ======================================================= */

  {
    path: "/booking",
    component: () =>
      import(
        "../../pages/booking/booking.js"
      ),
    functionName: "Booking",
    meta: {
      title: "Booking"
    }
  },

  /* =======================================================
     DYNAMIC ROUTES
  ======================================================= */

  {
    path: "/baito/:id",
    component: () =>
      import(
        "../../pages/baitos/displayBaito.js"
      ),
    functionName: "Baito",
    meta: {
      title: "Baito"
    }
  },

  {
    path: "/baitos/worker/:id",
    component: () =>
      import(
        "../../pages/baitos/displayBaitoWorker.js"
      ),
    functionName: "Worker",
    meta: {
      requiresAuth: true,
      title: "Worker"
    }
  }
];