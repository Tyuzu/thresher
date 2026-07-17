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

/* =========================
   SIGNUP
========================= */
async function signup(event) {
    if (event) event.preventDefault();

    const username = document.getElementById("signup-username")?.value?.trim() || "";
    const email = document.getElementById("signup-email")?.value?.trim() || "";
    const password = document.getElementById("signup-password")?.value || "";

    const errors = validateInputs([
        {
            value: username,
            validator: isValidUsername,
            message: "Username must be between 3 and 20 characters."
        },
        {
            value: email,
            validator: isValidEmail,
            message: "Please enter a valid email."
        },
        {
            value: password,
            validator: isValidPassword,
            message: "Password must be at least 6 characters long."
        }
    ]);

    // Fixed: Ensure arrays or objects don't trigger error state falsely
    const hasErrors = Array.isArray(errors) ? errors.length > 0 : errors && Object.keys(errors).length > 0;

    if (hasErrors) {
        Notify(Array.isArray(errors) ? errors.join(", ") : errors, {
            type: "error",
            duration: 3000,
            dismissible: true
        });
        return;
    }

    try {
        await apiFetch("/auth/register", "POST", { username, email, password });

        Notify("Signup successful! You can now log in.", {
            type: "success",
            duration: 3000,
            dismissible: true
        });

        localStorage.setItem("redirectAfterLogin", "/home");
        navigate("/login");
    } catch (err) {
        Notify(err.message || "Signup failed.", {
            type: "error",
            duration: 3000,
            dismissible: true
        });
    }
}

/* =========================
   LOGIN
========================= */
async function login(event) {
    if (event) event.preventDefault();

    const username = document.getElementById("login-username")?.value?.trim() || "";
    const password = document.getElementById("login-password")?.value || "";

    if (!username || !password) {
        Notify("Username and password are required.", {
            type: "error",
            duration: 3000,
            dismissible: true
        });
        return;
    }

    try {
        const res = await apiFetch("/auth/login", "POST", 
            { username, password }, 
            { credentials: "include" }
        );

        const token = res?.data?.token;
        const userId = res?.data?.userid;

        if (!token || !userId) {
            throw new Error("Invalid response format from server.");
        }

        // Persist access token & base user data
        setState({ token, user: userId, username }, true);

        // Best-effort profile fetch
        try {
            const profile = await fetchProfile();
            if (profile) {
                setState({ userProfile: profile }, true);
            }
        } catch {
            Notify("Logged in, but profile could not be loaded.", {
                type: "info",
                duration: 3000,
                dismissible: true
            });
        }

        // Redirect handling
        const redirect = localStorage.getItem("redirectAfterLogin") || "/home";
        localStorage.removeItem("redirectAfterLogin");

        navigate(redirect === "/login" ? "/home" : redirect);

    } catch (err) {
        Notify(err?.message || "Login failed.", {
            type: "error",
            duration: 3000,
            dismissible: true
        });
    }
}

/* =========================
   TOKEN REFRESH
========================= */
async function refreshAccessToken() {
    try {
        const res = await apiFetch("/auth/refresh", "POST", null, { credentials: "include" });
        const token = res?.data?.token;
        if (token) {
            setState({ token }, true);
            return token;
        }
        throw new Error("No token returned");
    } catch (err) {
        silentLogout();
        throw err;
    }
}

/* =========================
   LOGOUT
========================= */
async function logout() {
    try {
        await apiFetch("/auth/logout", "POST", null, {
            headers: { "X-Refresh-Intent": "1" },
            credentials: "include"
        });
    } catch (e) {
        // Fail silently on server-side logout errors to ensure UI cleans up regardless
    }
    silentLogout();
}

function silentLogout() {
    clearState();
    sessionStorage.clear();
    localStorage.removeItem("redirectAfterLogin");

    // Defends against Module Evaluation TDZ
    queueMicrotask(() => {
        navigate("/login");
    });
}

/* =========================
   REACTIVE SUBSCRIPTIONS
========================= */
subscribeDeep("userProfile.role", role => {
    document.body.dataset.isAdmin =
        Array.isArray(role) && role.includes("admin") ? "true" : "false";
});

export { signup, login, logout, silentLogout, refreshAccessToken };