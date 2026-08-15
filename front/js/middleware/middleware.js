// middleware.js
import { getState } from "../state/state.js";

/* ==========================================
   STATE EXTRACTION & NORMALIZATION
========================================== */

/**
 * Ensures state attributes are hydrated and normalized before guard execution.
 * Handles single string vs. array role declarations safely.
 */
function getAuthState() {
  const state = getState() || {};
  
  // Account for state structure across auth & userProfile modules
  const rawRoles = state?.auth?.roles || state?.userProfile?.role || [];
  const rawPermissions = state?.auth?.permissions || state?.userProfile?.permissions || [];

  return {
    auth: state?.auth || {},
    isLoading: state?.auth?.loading ?? false,
    isAuthenticated: !!state?.auth?.isAuthenticated && !!state?.auth?.accessToken,
    // Normalize string or array formats into a flat array of strings
    roles: Array.isArray(rawRoles) 
      ? rawRoles 
      : typeof rawRoles === "string" ? [rawRoles] : [],
    permissions: Array.isArray(rawPermissions) 
      ? rawPermissions 
      : typeof rawPermissions === "string" ? [rawPermissions] : [],
    isProfileComplete: state?.userProfile?.isProfileComplete ?? true
  };
}

/* ==========================================
   AUTHENTICATION & AUTHORIZATION GUARDS
========================================== */

/**
 * Ensures the user is authenticated.
 * Stores deep-link intent in sessionStorage for post-login redirection.
 */
export async function authGuard(context) {
  const { isAuthenticated } = getAuthState();

  if (!isAuthenticated) {
    const fullTarget = context.search ? `${context.path}${context.search}` : context.path;
    sessionStorage.setItem("redirectAfterLogin", fullTarget);
    return "/login";
  }
}

/**
 * Prevents authenticated users from reaching guest-only routes (e.g., /login, /signup).
 */
export async function guestGuard() {
  const { isAuthenticated } = getAuthState();

  if (isAuthenticated) {
    return "/dashboard";
  }
}

/**
 * Higher-order guard factory for checking user roles.
 * @param {string[]} allowedRoles - Roles allowed to access the route.
 * @param {'ANY' | 'ALL'} [matchMode='ANY'] - Requirement matching strategy.
 */
export function roleGuard(allowedRoles = [], matchMode = "ANY") {
  return async (context) => {
    const { isAuthenticated, roles } = getAuthState();

    if (!isAuthenticated) {
      const fullTarget = context.search ? `${context.path}${context.search}` : context.path;
      sessionStorage.setItem("redirectAfterLogin", fullTarget);
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
 * Higher-order guard factory for checking granular permissions.
 * @param {string[]} requiredPermissions - Permissions required.
 * @param {'ANY' | 'ALL'} [matchMode='ALL'] - Defaults to ALL for strict access enforcement.
 */
export function permissionGuard(requiredPermissions = [], matchMode = "ALL") {
  return async (context) => {
    const { isAuthenticated, permissions } = getAuthState();

    if (!isAuthenticated) {
      const fullTarget = context.search ? `${context.path}${context.search}` : context.path;
      sessionStorage.setItem("redirectAfterLogin", fullTarget);
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

/* ==========================================
   APP WORKFLOW & CONFIGURATION GUARDS
========================================== */

/**
 * Directs newly registered users to complete onboarding before accessing the rest of the application.
 */
export async function onboardingGuard(context) {
  const { isAuthenticated, isProfileComplete } = getAuthState();

  if (isAuthenticated && !isProfileComplete && context.path !== "/onboarding") {
    return "/onboarding";
  }
}

/**
 * Restricts access to routes protected by active feature flags.
 * @param {string} requiredFeature - The key of the feature flag.
 */
export function featureFlagGuard(requiredFeature) {
  return async () => {
    const state = getState() || {};
    const enabledFeatures = state?.config?.featureFlags || [];

    if (!enabledFeatures.includes(requiredFeature)) {
      return "/404";
    }
  };
}

/**
 * Prevents route transition if unsaved state/forms exist.
 */
export async function unsavedChangesGuard() {
  const state = getState() || {};
  if (state?.ui?.hasUnsavedChanges) {
    const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
    if (!confirmed) {
      return false; // Signals to the router engine to abort transition
    }
  }
}

/* ==========================================
   SIDE-EFFECT & METADATA MIDDLEWARE
========================================== */

/**
 * Dynamically updates document head details (Title & Description) on navigation.
 */
export function titleGuard(context) {
  const { title, description } = context.route?.meta || {};
  
  document.title = title ? `${title} | My App` : "My App";

  if (description) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;
  }
}

/**
 * Reports page views to analytics pipelines on navigation events.
 */
export function analyticsGuard(context) {
  if (typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_path: context.path,
      page_title: context.route?.meta?.title || document.title
    });
  }
}

/* ==========================================
   META-DRIVEN PIPELINE ORCHESTRATOR
========================================== */

/**
 * Meta-Driven Middleware Pipeline
 * Reads `meta` objects defined on route configurations and executes checks sequentially.
 */
export async function metaGuard(context) {
  const { meta } = context.route || {};
  if (!meta) return;

  // 1. Unsaved Changes Intercept
  const unsavedResult = await unsavedChangesGuard();
  if (unsavedResult === false) return false;

  // 2. Authentication & Guest Guards
  if (meta.requiresAuth) {
    const authResult = await authGuard(context);
    if (authResult) return authResult;
  } else if (meta.guestOnly) {
    const guestResult = await guestGuard(context);
    if (guestResult) return guestResult;
  }

  // 3. Onboarding Guard
  if (meta.requiresOnboarding !== false) {
    const onboardingResult = await onboardingGuard(context);
    if (onboardingResult) return onboardingResult;
  }

  // 4. Role Authorization
  if (meta.roles && meta.roles.length > 0) {
    const roleResult = await roleGuard(meta.roles, meta.roleMatchMode || "ANY")(context);
    if (roleResult) return roleResult;
  }

  // 5. Permission Authorization
  if (meta.permissions && meta.permissions.length > 0) {
    const permResult = await permissionGuard(meta.permissions, meta.permMatchMode || "ALL")(context);
    if (permResult) return permResult;
  }

  // 6. Feature Toggle Verification
  if (meta.featureFlag) {
    const featureResult = await featureFlagGuard(meta.featureFlag)();
    if (featureResult) return featureResult;
  }

  // 7. Non-blocking Side-effects (SEO & Tracking)
  titleGuard(context);
  analyticsGuard(context);
}