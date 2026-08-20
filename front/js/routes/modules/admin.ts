export const adminRoutes = [
  /* =======================================================
     ADMIN
  ======================================================= */

  {
    path: "/admin",
    component: () =>
      import(
        "../../pages/admin/admin.ts"
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
        "../../pages/dash/dash.ts"
      ),
    functionName: "Dash",
    meta: {
      requiresAuth: true,
      title: "Dashboard"
    }
  }
];