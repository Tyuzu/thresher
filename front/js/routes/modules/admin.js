import { safeArgBuilder } from "../safeArgsBuilder.js";
export const adminStaticRoutes = {
  "/admin": { moduleImport: () => import("../../pages/admin/admin.js"), functionName: "Admin", protected: true },
  "/dash": { moduleImport: () => import("../../pages/dash/dash.js"), functionName: "Dash", protected: true },
};

export const adminDynamicRoutes = [];