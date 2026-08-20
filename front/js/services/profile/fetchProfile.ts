// fetchProfile.js

import { getState, setState } from "../../state/state.ts";
import { apiFetch } from "../../api/api.ts";
import Notify from "../../components/ui/Notify.mjs";

/* ============================================================
    HELPERS
============================================================ */

function notifyError(message) {
  Notify(message, {
    type: "error",
    duration: 3000,
    dismissible: true
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

/* ============================================================
    FETCH LOGGED-IN USER PROFILE
============================================================ */

/**
 * Fetches the currently authenticated user's profile and updates app state
 * @returns {Promise<Object|null>}
 */
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

    console.error("Error fetching authenticated profile:", error);
    setState({ userProfile: null }, true);
    notifyError("An unexpected error occurred while fetching your profile.");
    return null;
  }
}

/* ============================================================
    FETCH PUBLIC USER PROFILE
============================================================ */

/**
 * Fetches another user's public profile details by username
 * @param {string} username 
 * @returns {Promise<Object|null>}
 */
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

    // Check for essential entity properties instead of requiring is_following
    return data.userid || data.id || data.username ? data : null;
  } catch (error) {
    if (error?.name === "AbortError") {
      return null;
    }

    console.error(`Error fetching profile for user "${username}":`, error);
    return null;
  }
}

/* ============================================================
    FETCH USER DATA BY ENTITY TYPE
============================================================ */

/**
 * Fetches entity-specific data (posts, media, likes, etc.) for a user
 * @param {string} username 
 * @param {string} entityType 
 * @returns {Promise<Object|Array|null>}
 */
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
      `Error fetching ${entityType} data for user "${username}":`,
      error
    );
    throw error;
  }
}

export {
  fetchProfile,
  fetchUserProfile,
  fetchUserProfileData
};