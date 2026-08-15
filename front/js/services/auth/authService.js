import { setState, clearState, subscribeDeep } from "../../state/state.js";
import {
    validateInputs,
    isValidUsername,
    isValidEmail,
    isValidPassword
} from "../../utils/utils.js";
import { navigate } from "../../routes/index.js";
import { fetchProfile } from "../profile/fetchProfile.js";
import Notify from "../../components/ui/Notify.mjs";
import { apiFetch } from "../../api/api.js";
import LoadingSpinner from "../../components/ui/LoadingSpinner.mjs";

/* =========================
   REACTIVE SUBSCRIPTIONS
========================= */
subscribeDeep("userProfile.role", (role) => {
    const isAdmin = Array.isArray(role) ? role.includes("admin") : role === "admin";
    document.body.dataset.isAdmin = isAdmin ? "true" : "false";
});

/* =========================
   SIGNUP
========================= */
export async function signup(payload) {
    let username = payload?.username;
    let email = payload?.email;
    let password = payload?.password;

    // Fallback if triggered directly as an event handler
    if (payload?.preventDefault) {
        payload.preventDefault();
        username = document.getElementById("signup-username")?.value?.trim() || "";
        email = document.getElementById("signup-email")?.value?.trim() || "";
        password = document.getElementById("signup-password")?.value || "";
    }

    const errors = validateInputs([
        { value: username, validator: isValidUsername, message: "Username must be between 3 and 20 characters." },
        { value: email, validator: isValidEmail, message: "Please enter a valid email." },
        { value: password, validator: isValidPassword, message: "Password must be at least 6 characters long." }
    ]);

    const hasErrors = Array.isArray(errors) ? errors.length > 0 : errors && Object.keys(errors).length > 0;

    if (hasErrors) {
        const errorMsg = Array.isArray(errors) ? errors.join(", ") : String(errors);
        Notify(errorMsg, { type: "error", duration: 3000, dismissible: true });
        return false;
    }

    const hideSpinner = LoadingSpinner();

    try {
        await apiFetch("/auth/register", "POST", { username, email, password }, { credentials: "include" });

        Notify("Signup successful! You can now log in.", {
            type: "success",
            duration: 3000,
            dismissible: true
        });

        return true;
    } catch (err) {
        const errorMsg = typeof err === "string" ? err : err?.message || err?.error || "Signup failed.";
        Notify(errorMsg, { type: "error", duration: 3000, dismissible: true });
        return false;
    } finally {
        if (typeof hideSpinner === "function") hideSpinner();
    }
}

/* =========================
   LOGIN
========================= */
export async function login(payload) {
    let username = payload?.username;
    let password = payload?.password;

    // Fallback if triggered directly as an event handler
    if (payload?.preventDefault) {
        payload.preventDefault();
        username = document.getElementById("login-username")?.value?.trim() || "";
        password = document.getElementById("login-password")?.value || "";
    }

    if (!username || !password) {
        Notify("Username and password are required.", { type: "error", duration: 3000, dismissible: true });
        return false;
    }

    const hideSpinner = LoadingSpinner();

    try {
        const res = await apiFetch("/auth/login", "POST", { username, password }, { credentials: "include" });

        const token = res?.token || res?.Token;
        const userId = res?.user_id || res?.userid || res?.userId || res?.UserID;

        if (!token || !userId) {
            throw new Error("Invalid response format from server.");
        }

        try {
            const profile = await fetchProfile();
            if (profile) {
                setState({ userProfile: profile }, false);
            }
        } catch {
            Notify("Logged in, but profile details could not be loaded.", { type: "info", duration: 3000, dismissible: true });
        }

        // Commit authentication state
        setState({ token, user: userId, username }, true);

        // Determine post-login target route
        const savedRedirect = localStorage.getItem("redirectAfterLogin");
        localStorage.removeItem("redirectAfterLogin");

        const target =
            savedRedirect &&
            savedRedirect.startsWith("/") &&
            savedRedirect !== "/login" &&
            savedRedirect !== "/logout"
                ? savedRedirect
                : "/";

        // Defer navigation slightly to break out of layoutState.isNavigating lock
        setTimeout(() => {
            navigate(target);
        }, 0);

        return true;
    } catch (err) {
        Notify(err?.message || "Login failed.", { type: "error", duration: 3000, dismissible: true });
        return false;
    } finally {
        if (typeof hideSpinner === "function") hideSpinner();
    }
}

/* =========================
   TOKEN REFRESH & LOGOUT
========================= */
export async function refreshAccessToken() {
    try {
        const res = await apiFetch("/auth/refresh", "POST", null, {
            headers: { "X-Refresh-Intent": "1" },
            credentials: "include"
        });

        const token = res?.data?.token || res?.token || res?.Token;
        if (token) {
            setState({ token }, true);
            return token;
        }
        throw new Error("No token returned");
    } catch {
        silentLogout();
        return null;
    }
}

export async function logout() {
    try {
        await apiFetch("/auth/logout", "POST", null, {
            headers: { "X-Refresh-Intent": "1" },
            credentials: "include"
        });
    } catch {
        // Fail silently
    } finally {
        silentLogout();
    }
}

export function silentLogout() {
    clearState();
    sessionStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("redirectAfterLogin");

    queueMicrotask(() => {
        navigate("/login");
    });
}