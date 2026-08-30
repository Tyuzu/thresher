import { getState } from "../state/state.js";

/* =========================================================
   TYPES & INTERFACES
========================================================= */
declare global {
  interface Window {
    gtag?: (event: string, action: string, params: Record<string, any>) => void;
  }
}

export type MatchMode = "ANY" | "ALL";

export interface RouteMeta {
  title?: string;
  description?: string;
  requiresAuth?: boolean;
  guestOnly?: boolean;
  requiresOnboarding?: boolean;
  roles?: string[];
  roleMatchMode?: MatchMode;
  permissions?: string[];
  permMatchMode?: MatchMode;
  featureFlag?: string;
  [key: string]: any;
}

export interface RouteContext {
  path: string;
  search?: string;
  query?: Record<string, string>;
  fullPath?: string;
  params?: Record<string, string | undefined>;
  route?: {
    meta?: RouteMeta;
    [key: string]: any;
  };
}

export type GuardResult = boolean | string;
export type GuardFunction = (context: RouteContext) => Promise<GuardResult> | GuardResult;

export interface AuthState {
  state: any;
  auth: any;
  user: any;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  roles: string[];
  permissions: string[];
  isProfileComplete: boolean;
}

/* =========================================================
   AUTH STATE
========================================================= */
function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && Boolean(item));
  }
  if (typeof value === "string" && value.trim()) {
    return [value];
  }
  return [];
}

function getAuthState(): AuthState {
  const state = getState() || {};
  const auth = state.auth || {};
  const user = state.user || auth.user || state.userProfile || {};
  const accessToken = auth.accessToken || state.token || null;
  const roles = normalizeArray(
    auth.roles || user.roles || user.role || state.userProfile?.roles || state.userProfile?.role
  );
  const permissions = normalizeArray(
    auth.permissions || user.permissions || state.userProfile?.permissions
  );
  const isAuthenticated = Boolean(auth.isAuthenticated || accessToken);
  
  return {
    state,
    auth,
    user,
    accessToken,
    isAuthenticated,
    isLoading: auth.loading === true,
    roles,
    permissions,
    isProfileComplete: user?.isProfileComplete ?? state.userProfile?.isProfileComplete ?? true
  };
}

/* =========================================================
   REDIRECT TARGET
========================================================= */
function getFullTarget(context: RouteContext): string {
  if (context?.fullPath) {
    return context.fullPath;
  }
  const path = context?.path || "/";
  const search = context?.search || "";
  return `${path}${search}`;
}

function storeLoginRedirect(context: RouteContext): void {
  if (typeof window === "undefined") return;
  
  const target = getFullTarget(context);
  const ignoredPaths = ["/", "/login", "/logout", "/404", "/error/403"];
  
  if (target && !ignoredPaths.includes(context.path)) {
    sessionStorage.setItem("redirectAfterLogin", target);
  }
}

/* =========================================================
   GUARDS
========================================================= */
export async function authGuard(context: RouteContext): Promise<GuardResult> {
  const { isAuthenticated } = getAuthState();
  if (!isAuthenticated) {
    storeLoginRedirect(context);
    return "/login";
  }
  return true;
}

export async function guestGuard(): Promise<GuardResult> {
  const { isAuthenticated } = getAuthState();
  if (isAuthenticated) {
    return "/";
  }
  return true;
}

export function roleGuard(allowedRoles: string[] = [], matchMode: MatchMode = "ANY"): GuardFunction {
  return async (context: RouteContext): Promise<GuardResult> => {
    const { isAuthenticated, roles } = getAuthState();
    if (!isAuthenticated) {
      storeLoginRedirect(context);
      return "/login";
    }
    const normalizedRoles = normalizeArray(allowedRoles);
    if (normalizedRoles.length === 0) {
      return true;
    }
    const hasAccess =
      matchMode === "ALL"
        ? normalizedRoles.every((role) => roles.includes(role))
        : normalizedRoles.some((role) => roles.includes(role));
        
    if (!hasAccess) {
      return "/error/403";
    }
    return true;
  };
}

export function permissionGuard(requiredPermissions: string[] = [], matchMode: MatchMode = "ALL"): GuardFunction {
  return async (context: RouteContext): Promise<GuardResult> => {
    const { isAuthenticated, permissions } = getAuthState();
    if (!isAuthenticated) {
      storeLoginRedirect(context);
      return "/login";
    }
    const required = normalizeArray(requiredPermissions);
    if (required.length === 0) {
      return true;
    }
    const hasAccess =
      matchMode === "ALL"
        ? required.every((permission) => permissions.includes(permission))
        : required.some((permission) => permissions.includes(permission));

    if (!hasAccess) {
      return "/error/403";
    }
    return true;
  };
}

export async function onboardingGuard(context: RouteContext): Promise<GuardResult> {
  const { isAuthenticated, isProfileComplete } = getAuthState();
  
  if (isAuthenticated) {
    // Needs onboarding but trying to go elsewhere
    if (!isProfileComplete && context.path !== "/onboarding") {
      return "/onboarding";
    }
    // Completed onboarding but trying to visit /onboarding
    if (isProfileComplete && context.path === "/onboarding") {
      return "/";
    }
  }
  return true;
}

export function featureFlagGuard(requiredFeature: string): () => Promise<GuardResult> {
  return async (): Promise<GuardResult> => {
    const state = getState() || {};
    const enabledFeatures: string[] = state.config?.featureFlags || [];
    if (!enabledFeatures.includes(requiredFeature)) {
      return "/404";
    }
    return true;
  };
}

export async function unsavedChangesGuard(): Promise<boolean> {
  if (typeof window === "undefined") return true;

  const state = getState() || {};
  if (state.ui?.hasUnsavedChanges) {
    const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
    if (!confirmed) {
      return false;
    }
  }
  return true;
}

/* =========================================================
   SIDE EFFECTS
========================================================= */
export function titleGuard(context: RouteContext): void {
  if (typeof document === "undefined") return;

  const meta = context.route?.meta || {};
  const { title, description } = meta;
  document.title = title ? `${title} | My App` : "My App";
  if (description) {
    let metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = description;
  }
}

export function analyticsGuard(context: RouteContext): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("event", "page_view", {
    page_path: context.fullPath || context.path,
    page_title: context.route?.meta?.title || document.title
  });
}

/* =========================================================
   META PIPELINE
========================================================= */
export async function metaGuard(context: RouteContext): Promise<GuardResult> {
  const meta = context.route?.meta || {};

  // 1. Unsaved Changes
  const unsavedResult = await unsavedChangesGuard();
  if (unsavedResult === false) {
    return false;
  }

  // 2. Auth & Guest
  if (meta.requiresAuth) {
    const result = await authGuard(context);
    if (typeof result === "string" || result === false) return result;
  }
  if (meta.guestOnly) {
    const result = await guestGuard();
    if (typeof result === "string" || result === false) return result;
  }

  // 3. Onboarding
  if (meta.requiresOnboarding !== undefined) {
    const result = await onboardingGuard(context);
    if (typeof result === "string" || result === false) return result;
  }

  // 4. Roles
  if (Array.isArray(meta.roles) && meta.roles.length > 0) {
    const result = await roleGuard(meta.roles, meta.roleMatchMode || "ANY")(context);
    if (typeof result === "string" || result === false) return result;
  }

  // 5. Permissions
  if (Array.isArray(meta.permissions) && meta.permissions.length > 0) {
    const result = await permissionGuard(meta.permissions, meta.permMatchMode || "ALL")(context);
    if (typeof result === "string" || result === false) return result;
  }

  // 6. Feature Flags
  if (meta.featureFlag) {
    const result = await featureFlagGuard(meta.featureFlag)();
    if (typeof result === "string" || result === false) return result;
  }

  // 7. Side Effects
  titleGuard(context);
  analyticsGuard(context);
  return true;
}