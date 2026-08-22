import {
    getState
} from "../state/state.js";
/* =========================================================
   AUTH STATE
========================================================= */
function normalizeArray(value) {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
        return [value];
    }
    return [];
}

function getAuthState() {
    const state = getState() || {};
    const auth = state.auth || {};
    const user = state.user || auth.user || state.userProfile || {};
    const accessToken = auth.accessToken || state.token || null;
    const roles = normalizeArray(auth.roles || user.roles || user.role || state.userProfile?.roles || state.userProfile?.role);
    const permissions = normalizeArray(auth.permissions || user.permissions || state.userProfile?.permissions);
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
function getFullTarget(context) {
    if (context?.fullPath) {
        return context.fullPath;
    }
    const path = context?.path || "/";
    const search = context?.search || "";
    return `${path}${search}`;
}

function storeLoginRedirect(context) {
    const target = getFullTarget(context);
    if (target && target !== "/" && target !== "/login" && target !== "/logout") {
        sessionStorage.setItem("redirectAfterLogin", target);
    }
}
/* =========================================================
   AUTH GUARD
========================================================= */
export async function authGuard(context) {
    const {
        isAuthenticated
    } = getAuthState();
    if (!isAuthenticated) {
        storeLoginRedirect(context);
        return "/login";
    }
    return true;
}
/* =========================================================
   GUEST GUARD
========================================================= */
export async function guestGuard() {
    const {
        isAuthenticated
    } = getAuthState();
    if (isAuthenticated) {
        return "/";
    }
    return true;
}
/* =========================================================
   ROLE GUARD
========================================================= */
export function roleGuard(allowedRoles = [], matchMode = "ANY") {
    return async (context) => {
        const {
            isAuthenticated,
            roles
        } = getAuthState();
        if (!isAuthenticated) {
            storeLoginRedirect(context);
            return "/login";
        }
        const normalizedRoles = normalizeArray(allowedRoles);
        if (normalizedRoles.length === 0) {
            return true;
        }
        const hasAccess = matchMode === "ALL" ? normalizedRoles.every(
            (role) => roles.includes(role)) : normalizedRoles.some(
            (role) => roles.includes(role));
        if (!hasAccess) {
            return "/error/403";
        }
        return true;
    };
}
/* =========================================================
   PERMISSION GUARD
========================================================= */
export function permissionGuard(requiredPermissions = [], matchMode = "ALL") {
    return async (context) => {
        const {
            isAuthenticated,
            permissions
        } = getAuthState();
        if (!isAuthenticated) {
            storeLoginRedirect(context);
            return "/login";
        }
        const required = normalizeArray(requiredPermissions);
        if (required.length === 0) {
            return true;
        }
        const hasAccess = matchMode === "ALL" ? required.every(
            (permission) => permissions.includes(permission)) : required.some(
            (permission) => permissions.includes(permission));
        if (!hasAccess) {
            return "/error/403";
        }
        return true;
    };
}
/* =========================================================
   ONBOARDING
========================================================= */
export async function onboardingGuard(context) {
    const {
        isAuthenticated,
        isProfileComplete
    } = getAuthState();
    /*
     * IMPORTANT:
     *
     * The old implementation ran onboardingGuard
     * for every route because:
     *
     * meta.requiresOnboarding !== false
     *
     * That made onboarding effectively global.
     *
     * It is now opt-in through metadata.
     */
    if (isAuthenticated && context.path !== "/onboarding" && !isProfileComplete) {
        return "/onboarding";
    }
    return true;
}
/* =========================================================
   FEATURE FLAG
========================================================= */
export function featureFlagGuard(requiredFeature) {
    return async () => {
        const state = getState() || {};
        const enabledFeatures = state.config?.featureFlags || [];
        if (!enabledFeatures.includes(requiredFeature)) {
            return "/404";
        }
        return true;
    };
}
/* =========================================================
   UNSAVED CHANGES
========================================================= */
export async function unsavedChangesGuard() {
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
   TITLE
========================================================= */
export function titleGuard(context) {
    const meta = context.route?.meta || {};
    const {
        title,
        description
    } = meta;
    document.title = title ? `${title} | My App` : "My App";
    if (description) {
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement("meta");
            metaDescription.name = "description";
            document.head.appendChild(metaDescription);
        }
        metaDescription.content = description;
    }
}
/* =========================================================
   ANALYTICS
========================================================= */
export function analyticsGuard(context) {
    if (typeof window.gtag !== "function") {
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
export async function metaGuard(context) {
    const meta = context.route?.meta || {};
    /* -------------------------------------------------------
       1. UNSAVED CHANGES
    ------------------------------------------------------- */
    const unsavedResult = await unsavedChangesGuard();
    if (unsavedResult === false) {
        return false;
    }
    /* -------------------------------------------------------
       2. AUTH / GUEST
    ------------------------------------------------------- */
    if (meta.requiresAuth) {
        const result = await authGuard(context);
        if (typeof result === "string" || result === false) {
            return result;
        }
    }
    if (meta.guestOnly) {
        const result = await guestGuard(context);
        if (typeof result === "string" || result === false) {
            return result;
        }
    }
    /* -------------------------------------------------------
       3. ONBOARDING
    ------------------------------------------------------- */
    if (meta.requiresOnboarding === true) {
        const result = await onboardingGuard(context);
        if (typeof result === "string" || result === false) {
            return result;
        }
    }
    /* -------------------------------------------------------
       4. ROLES
    ------------------------------------------------------- */
    if (Array.isArray(meta.roles) && meta.roles.length > 0) {
        const result = await roleGuard(meta.roles, meta.roleMatchMode || "ANY")(context);
        if (typeof result === "string" || result === false) {
            return result;
        }
    }
    /* -------------------------------------------------------
       5. PERMISSIONS
    ------------------------------------------------------- */
    if (Array.isArray(meta.permissions) && meta.permissions.length > 0) {
        const result = await permissionGuard(meta.permissions, meta.permMatchMode || "ALL")(context);
        if (typeof result === "string" || result === false) {
            return result;
        }
    }
    /* -------------------------------------------------------
       6. FEATURE FLAG
    ------------------------------------------------------- */
    if (meta.featureFlag) {
        const result = await featureFlagGuard(meta.featureFlag)();
        if (typeof result === "string" || result === false) {
            return result;
        }
    }
    /* -------------------------------------------------------
       7. SIDE EFFECTS
    ------------------------------------------------------- */
    titleGuard(context);
    analyticsGuard(context);
    return true;
}