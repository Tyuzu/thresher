import { authGuard } from "../../middleware/middleware.js";

export const baitoRoutes = [
  // Static
  {
    path: "/baitos",
    component: () => import("../../pages/baitos/baitos.js"),
    functionName: "Baitos"
  },
  {
    path: "/baitos/dash",
    component: () => import("../../pages/baitos/baitoDash.js"),
    functionName: "BaitoDash",
    middleware: [authGuard]
  },
  {
    path: "/baitos/hire",
    component: () => import("../../pages/baitos/hireWorkers.js"),
    functionName: "HireWorkers"
  },
  {
    path: "/baitos/create-profile",
    component: () => import("../../pages/baitos/createProfile.js"),
    functionName: "CreateBaitoProfile",
    middleware: [authGuard]
  },
  {
    path: "/create-baito",
    component: () => import("../../pages/baitos/createNewBaito.js"),
    functionName: "CreateBaito",
    middleware: [authGuard]
  },
  {
    path: "/booking",
    component: () => import("../../pages/booking/booking.js"),
    functionName: "Booking"
  },

  // Dynamic
  {
    path: "/baito/:id",
    component: () => import("../../pages/baitos/displayBaito.js"),
    functionName: "Baito"
  },
  {
    path: "/baitos/worker/:id",
    component: () => import("../../pages/baitos/displayBaitoWorker.js"),
    functionName: "Worker",
    middleware: [authGuard]
  }
];