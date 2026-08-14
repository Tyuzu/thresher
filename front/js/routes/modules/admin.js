import { authGuard, roleGuard } from "../../middleware/middleware.js";

export const adminRoutes = [
  {
    path: "/admin",
    component: () => import("../../pages/admin/admin.js"),
    functionName: "Admin",
    middleware: [authGuard, roleGuard(["admin"])]
  },
  {
    path: "/dash",
    component: () => import("../../pages/dash/dash.js"),
    functionName: "Dash",
    middleware: [authGuard]
  }
];