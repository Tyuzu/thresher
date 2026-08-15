import { getState, setState } from "../../state/state.js";
import { apiFetch } from "../../api/api.js";
import Notify from "../../components/ui/Notify.mjs";

function notifyError(message) {
    Notify(message, {
        type: "error",
        duration: 3000,
        dismissible: true,
    });
}

function getAccessToken() {
    return (
        getState("token") ||
        getState("auth")?.accessToken ||
        localStorage.getItem("token") ||
        null
    );
}

async function fetchProfile() {
    const token = getAccessToken();

    if (!token) {
        setState({ userProfile: null }, true);
        return null;
    }

    try {
        const profile = await apiFetch("/profile/profile", "GET");

        if (!profile) {
            setState({ userProfile: null }, true);
            notifyError("Failed to load profile.");
            return null;
        }

        setState({ userProfile: profile }, true);
        return profile;
    } catch (error) {
        if (error?.name === "AbortError") {
            return null;
        }

        console.error("Error fetching profile:", error);
        setState({ userProfile: null }, true);
        notifyError("An unexpected error occurred while fetching the profile.");
        return null;
    }
}

async function fetchUserProfile(username) {
    if (typeof username !== "string" || !username.trim()) {
        return null;
    }

    const encodedUsername = encodeURIComponent(username.trim());

    try {
        const data = await apiFetch(`/user/${encodedUsername}`, "GET");

        if (!data || typeof data !== "object") {
            return null;
        }

        return data.is_following !== undefined ? data : null;
    } catch (error) {
        if (error?.name === "AbortError") {
            return null;
        }

        console.error("Error fetching user profile:", error);
        return null;
    }
}

async function fetchUserProfileData(username, entityType) {
    if (typeof username !== "string" || !username.trim()) {
        throw new Error("Username is required.");
    }

    if (typeof entityType !== "string" || !entityType.trim()) {
        throw new Error("Entity type is required.");
    }

    const encodedUsername = encodeURIComponent(username.trim());
    const encodedEntityType = encodeURIComponent(entityType.trim());

    try {
        return await apiFetch(
            `/user/${encodedUsername}/data?entity_type=${encodedEntityType}`,
            "GET"
        );
    } catch (error) {
        if (error?.name === "AbortError") {
            return null;
        }

        console.error(
            `Error fetching ${entityType} data for user:`,
            error
        );
        throw error;
    }
}

export {
    fetchProfile,
    fetchUserProfile,
    fetchUserProfileData,
};