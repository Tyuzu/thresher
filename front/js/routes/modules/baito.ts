export const baitoRoutes = [
  /* =======================================================
     BAITO
  ======================================================= */

  {
    path: "/baitos",
    component: () =>
      import(
        "../../pages/baitos/baitos.ts"
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
        "../../pages/baitos/baitoDash.ts"
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
        "../../pages/baitos/hireWorkers.ts"
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
        "../../pages/baitos/createProfile.ts"
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
        "../../pages/baitos/createNewBaito.ts"
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
        "../../pages/booking/booking.ts"
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
        "../../pages/baitos/displayBaito.ts"
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
        "../../pages/baitos/displayBaitoWorker.ts"
      ),
    functionName: "Worker",
    meta: {
      requiresAuth: true,
      title: "Worker"
    }
  }
];