import { getState } from "../state/state.js";

export async function runRouteGuards(route, targetPath) {
  const meta = route.meta || {};
  const token = getState("token");
  const user = getState("user");

  // 1. Unauthenticated users accessing protected routes
  if (meta.requiresAuth && !token) {
    localStorage.setItem("redirectAfterLogin", targetPath);
    return { allow: false, redirect: "/login" };
  }

  // 2. Authenticated users accessing guest-only routes (e.g. /login)
  if (meta.guestOnly && token) {
    return { allow: false, redirect: "/home" };
  }

  // 3. Role-based authorization guard
  if (meta.roles && meta.roles.length > 0) {
    const userRoles = Array.isArray(user?.role) ? user.role : [user?.role];
    const hasRole = meta.roles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      return { allow: false, redirect: "/403" };
    }
  }

  // 4. Permission-based authorization guard
  if (meta.permissions && meta.permissions.length > 0) {
    const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];
    const hasPerm = meta.permissions.every((perm) => userPerms.includes(perm));
    if (!hasPerm) {
      return { allow: false, redirect: "/403" };
    }
  }

  // 5. Route-level explicit middleware execution
  if (Array.isArray(route.middleware)) {
    for (const middlewareFn of route.middleware) {
      const result = await middlewareFn(route, targetPath);
      if (result === false) return { allow: false };
      if (typeof result === "string") return { allow: false, redirect: result };
    }
  }

  return { allow: true };
}