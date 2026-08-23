import { RouteMeta } from "./routeTypes.js";

export interface AdminRoute {
  path: string;
  component: () => Promise<unknown>;
  functionName: string;
  meta: RouteMeta;
}

export const adminRoutes: AdminRoute[] = [
  /* =======================================================
     ADMIN
  ======================================================= */

  {
    path: "/admin",
    component: () =>
      import(
        "../../pages/admin/admin.js"
      ),
    functionName: "Admin",
    meta: {
      requiresAuth: true,
      roles: ["admin"],
      title: "Admin"
    }
  },

  /* =======================================================
     DASHBOARD
  ======================================================= */

  {
    path: "/dash",
    component: () =>
      import(
        "../../pages/dash/dash.js"
      ),
    functionName: "Dash",
    meta: {
      requiresAuth: true,
      title: "Dashboard"
    }
  }
];