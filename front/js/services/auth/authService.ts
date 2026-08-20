import {
    setState,
    clearState,
    subscribe,
    getState
} from "../../state/state.ts";
import {
    validateInputs,
    isValidUsername,
    isValidEmail,
    isValidPassword
} from "../../utils/utils.ts";
import {
    fetchProfile
} from "../profile/fetchProfile.ts";
import Notify from "../../components/ui/Notify.ts";
import {
    apiFetch,
    refreshToken
} from "../../api/api.ts";
import LoadingSpinner from "../../components/ui/LoadingSpinner.ts";
/* =========================================================
   REACTIVE ROLE STATE
========================================================= */
function updateAdminState(roles) {
    const normalizedRoles = Array.isArray(roles) ? roles : roles ? [roles] : [];
    const isAdmin = normalizedRoles.includes("admin");
    if (typeof document !== "undefined") {
        document.body.dataset.isAdmin = isAdmin ? "true" : "false";
    }
}
subscribe("roles", updateAdminState);
updateAdminState(getState("roles"));
/* =========================================================
   HELPERS
========================================================= */
function normalizeRoles(value) {
    if (Array.isArray(value)) {
        return [...new Set(value.filter(
            (role) => role !== null && role !== undefined && String(role).trim()).map((role) => String(role).trim()))];
    }
    if (typeof value === "string" && value.trim()) {
        return [value.trim()];
    }
    return [];
}

function normalizePermissions(value) {
    if (Array.isArray(value)) {
        return [...new Set(value.filter(
            (permission) => permission !== null && permission !== undefined && String(permission).trim()).map((permission) => String(permission).trim()))];
    }
    if (typeof value === "string" && value.trim()) {
        return [value.trim()];
    }
    return [];
}

function parseJwtPayload(token) {
    try {
        const parts = token?.split(".");
        if (!parts || parts.length < 2) {
            return null;
        }
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat(
            (4 - (base64.length % 4)) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

function extractAuthPayload(response, fallbackUsername = "") {
    const data = response?.data && typeof response.data === "object" ? response.data : response;
    const token = response?.token ?? response?.Token ?? data?.token ?? data?.Token;
    if (!token) {
        throw new Error("Invalid response format from server.");
    }
    const jwt = parseJwtPayload(token) || {};
    const userId = response?.user_id ?? response?.userid ?? response?.userid ?? response?.UserID ?? data?.user_id ?? data?.userid ?? data?.userid ?? data?.UserID ?? jwt.userid ?? jwt.userID ?? jwt.user_id ?? jwt.sub ?? "";
    const username = response?.username ?? data?.username ?? jwt.username ?? fallbackUsername ?? "";
    const roles = normalizeRoles(response?.roles ?? response?.role ?? data?.roles ?? data?.role ?? jwt.roles ?? jwt.role);
    const permissions = normalizePermissions(response?.permissions ?? data?.permissions ?? jwt.permissions);
    /*
     * Canonical auth.user is an object.
     * userId remains available separately through the
     * state compatibility alias.
     */
    const user = response?.user && typeof response.user === "object" ? {
        ...response.user,
        userid: response.user.id ?? response.user.userid ?? userId,
        username: response.user.username ?? username
    } : data?.user && typeof data.user === "object" ? {
        ...data.user,
        userid: data.user.id ?? data.user.userid ?? userId,
        username: data.user.username ?? username
    } : {
        userid: userId || null,
        username: username || ""
    };
    return {
        token,
        user,
        userId: userId || user?.userid || null,
        username: user?.username || username || "",
        roles,
        permissions,
        auth: {
            isAuthenticated: true,
            accessToken: token,
            user,
            roles,
            permissions,
            loading: false
        }
    };
}
/* =========================================================
   SIGNUP
========================================================= */
export async function signup(payload = {}) {
    let username = payload?.username;
    let email = payload?.email;
    let password = payload?.password;
    if (payload?.preventDefault) {
        payload.preventDefault();
        username = document.getElementById("signup-username")?.value?.trim() || "";
        email = document.getElementById("signup-email")?.value?.trim() || "";
        password = document.getElementById("signup-password")?.value || "";
    }
    const errors = validateInputs([{
        value: username,
        validator: isValidUsername,
        message: "Username must be between 3 and 20 characters."
    }, {
        value: email,
        validator: isValidEmail,
        message: "Please enter a valid email."
    }, {
        value: password,
        validator: isValidPassword,
        message: "Password must be at least 6 characters long."
    }]);
    const hasErrors = Array.isArray(errors) ? errors.length > 0 : Boolean(errors && Object.keys(errors).length > 0);
    if (hasErrors) {
        const errorMessage = Array.isArray(errors) ? errors.join(", ") : String(errors);
        Notify(errorMessage, {
            type: "error",
            duration: 3000,
            dismissible: true
        });
        return false;
    }
    const hideSpinner = LoadingSpinner();
    try {
        await apiFetch("/auth/register", "POST", {
            username,
            email,
            password
        }, {
            credentials: "include",
            auth: false
        });
        Notify("Signup successful! You can now log in.", {
            type: "success",
            duration: 3000,
            dismissible: true
        });
        return true;
    } catch (error) {
        const message = typeof error === "string" ? error : error?.message || error?.error || "Signup failed.";
        Notify(message, {
            type: "error",
            duration: 3000,
            dismissible: true
        });
        return false;
    } finally {
        if (typeof hideSpinner === "function") {
            hideSpinner();
        }
    }
}
/* =========================================================
   LOGIN
========================================================= */
export async function login(payload = {}) {
    let username = payload?.username;
    let password = payload?.password;
    if (payload?.preventDefault) {
        payload.preventDefault();
        username = document.getElementById("login-username")?.value?.trim() || "";
        password = document.getElementById("login-password")?.value || "";
    }
    username = typeof username === "string" ? username.trim() : "";
    if (!username || !password) {
        Notify("Username and password are required.", {
            type: "error",
            duration: 3000,
            dismissible: true
        });
        return false;
    }
    const hideSpinner = LoadingSpinner();
    try {
        /*
         * Login is a public endpoint.
         */
        const response = await apiFetch("/auth/login", "POST", {
            username,
            password
        }, {
            credentials: "include",
            auth: false
        });
        const authPayload = extractAuthPayload(response, username);
        /*
         * Commit the token BEFORE fetching
         * the profile.
         */
        setState({
            token: authPayload.token,
            user: authPayload.user,
            userid: authPayload.userid,
            username: authPayload.username,
            roles: authPayload.roles,
            permissions: authPayload.permissions,
            auth: authPayload.auth
        }, true);
        /*
         * Profile request can now authenticate
         * using the committed access token.
         */
        try {
            const profile = await fetchProfile();
            if (profile) {
                setState({
                    userProfile: profile
                }, true);
                const profileRoles = normalizeRoles(profile.roles ?? profile.role);
                const profilePermissions = normalizePermissions(profile.permissions);
                if (profileRoles.length > 0) {
                    setState({
                        roles: profileRoles
                    }, true);
                }
                if (profilePermissions.length > 0) {
                    setState({
                        permissions: profilePermissions
                    }, true);
                }
                /*
                 * Keep auth.user enriched with profile
                 * information without losing the ID.
                 */
                const currentUser = getState("user");
                if (currentUser && typeof currentUser === "object") {
                    setState({
                        user: {
                            ...currentUser,
                            ...profile,
                            userid: currentUser.userid ?? getState("userid"),
                            username: profile.username ?? currentUser.username ?? getState("username")
                        }
                    }, true);
                }
            }
        } catch {
            Notify("Logged in, but profile details could not be loaded.", {
                type: "info",
                duration: 3000,
                dismissible: true
            });
        }
        return true;
    } catch (error) {
        Notify(error?.message || "Login failed.", {
            type: "error",
            duration: 3000,
            dismissible: true
        });
        return false;
    } finally {
        if (typeof hideSpinner === "function") {
            hideSpinner();
        }
    }
}
/* =========================================================
   MANUAL TOKEN REFRESH
========================================================= */
export async function refreshAccessToken() {
    const success = await refreshToken();
    return success ? getState("token") : null;
}
/* =========================================================
   LOGOUT
========================================================= */
export async function logout() {
    try {
        await apiFetch("/auth/logout", "POST", null, {
            credentials: "include",
            headers: {
                "X-Refresh-Intent": "1"
            }
        });
    } catch {
        /*
         * Logout must clear local authentication
         * even if the server request fails.
         */
    } finally {
        silentLogout(true);
    }
}
/* =========================================================
   LOCAL LOGOUT
========================================================= */
export function silentLogout(broadcast = true) {
    clearState();
    if (broadcast && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:logout", {
            detail: {
                broadcast: true
            }
        }));
    }
    if (typeof sessionStorage !== "undefined") {
        try {
            sessionStorage.removeItem("redirectAfterLogin");
        } catch {
            // Ignore storage failures.
        }
    }
    /*
     * Replace rather than push so protected
     * pages are not left in browser history.
     */
    if (typeof window !== "undefined") {
        queueMicrotask(async () => {
            try {
                const {
                    navigate
                } = await import("../../routes/navigate.ts");
                await navigate("/login", {
                    replace: true
                });
            } catch (error) {
                console.error("Logout navigation failed:", error);
            }
        });
    }
}
/* =========================================================
   AUTH UNAUTHORIZED EVENT
========================================================= */
if (typeof window !== "undefined") {
    window.addEventListener("auth:unauthorized",
        () => {
            silentLogout();
        });
}