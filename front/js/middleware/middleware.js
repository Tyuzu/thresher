import { getState } from "../state/state.js";

/**
 * Helper to ensure the central state is initialized or hydrated 
 * before middleware checks run (prevents premature redirects on page refresh).
 */
function getAuthState() {
  const state = getState();
  return {
    auth: state?.auth || {},
    isLoading: state?.auth?.loading ?? false,
    isAuthenticated: !!state?.auth?.isAuthenticated && !!state?.auth?.accessToken,
    roles: state?.auth?.roles || [],
    permissions: state?.auth?.permissions || []
  };
}

/**
 * Ensures the user is authenticated.
 * Stores deep-link intent for seamless post-login redirection.
 */
export async function authGuard(context) {
  const { isAuthenticated } = getAuthState();

  if (!isAuthenticated) {
    // Preserve current path and search query for post-login redirection
    const fullTarget = context.search ? `${context.path}${context.search}` : context.path;
    sessionStorage.setItem("redirectAfterLogin", fullTarget);
    return "/login";
  }
}

/**
 * Ensures the user is NOT authenticated (e.g., /login, /register).
 * Prevents logged-in users from seeing auth forms.
 */
export async function guestGuard() {
  const { isAuthenticated } = getAuthState();

  if (isAuthenticated) {
    return "/dashboard";
  }
}

/**
 * Higher-order middleware factory for checking roles.
 * @param {string[]} allowedRoles - List of roles permitted to access the route.
 * @param {'ANY' | 'ALL'} [matchMode='ANY'] - Requirement mode for multiple roles.
 */
export function roleGuard(allowedRoles = [], matchMode = "ANY") {
  return async (context) => {
    const { isAuthenticated, roles } = getAuthState();

    if (!isAuthenticated) {
      sessionStorage.setItem("redirectAfterLogin", context.path);
      return "/login";
    }

    const hasAccess = matchMode === "ALL"
      ? allowedRoles.every((role) => roles.includes(role))
      : allowedRoles.some((role) => roles.includes(role));

    if (!hasAccess) {
      return "/error/403";
    }
  };
}

/**
 * Higher-order middleware factory for checking permissions.
 * @param {string[]} requiredPermissions - List of permissions required.
 * @param {'ANY' | 'ALL'} [matchMode='ALL'] - Requirement mode (defaults to ALL for strict security).
 */
export function permissionGuard(requiredPermissions = [], matchMode = "ALL") {
  return async (context) => {
    const { isAuthenticated, permissions } = getAuthState();

    if (!isAuthenticated) {
      sessionStorage.setItem("redirectAfterLogin", context.path);
      return "/login";
    }

    const hasAccess = matchMode === "ALL"
      ? requiredPermissions.every((p) => permissions.includes(p))
      : requiredPermissions.some((p) => permissions.includes(p));

    if (!hasAccess) {
      return "/error/403";
    }
  };
}

/**
 * Meta-Driven Middleware Pipeline
 * Reads `meta` rules defined directly on routes so you don't have to manually
 * attach factories to every single route entry.
 */
export async function metaGuard(context) {
  const { meta } = context.route || {};
  if (!meta) return;

  // 1. Check Auth / Guest
  if (meta.requiresAuth) {
    const authResult = await authGuard(context);
    if (authResult) return authResult;
  } else if (meta.guestOnly) {
    const guestResult = await guestGuard(context);
    if (guestResult) return guestResult;
  }

  // 2. Check Roles
  if (meta.roles && meta.roles.length > 0) {
    const roleResult = await roleGuard(meta.roles, meta.roleMatchMode || "ANY")(context);
    if (roleResult) return roleResult;
  }

  // 3. Check Permissions
  if (meta.permissions && meta.permissions.length > 0) {
    const permResult = await permissionGuard(meta.permissions, meta.permMatchMode || "ALL")(context);
    if (permResult) return permResult;
  }
}