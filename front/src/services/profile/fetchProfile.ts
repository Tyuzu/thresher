import { getState, setState } from "../../state/state.js";
import Notify from "../../components/ui/Notify.js";
import {
  fetchMyProfile,
  fetchUserProfileByUsername,
  fetchUserProfileData as fetchUserProfileDataApi,
  type UserProfile
} from "./api.js";

interface AuthState {
  accessToken?: string;
}

/* ============================================================
    HELPERS
============================================================ */

function notifyError(message: string): void {
  Notify(message, {
    type: "error",
    duration: 3000,
    dismissible: true
  });
}

function getAccessToken(): string | null {
  return (
    (getState("token") as string) ||
    (getState("auth") as AuthState)?.accessToken ||
    localStorage.getItem("token") ||
    null
  );
}

/* ============================================================
    FETCH LOGGED-IN USER PROFILE
============================================================ */

/**
 * Fetches the currently authenticated user's profile and updates app state
 */
async function fetchProfile(): Promise<UserProfile | null> {
  const token = getAccessToken();

  if (!token) {
    setState({ userProfile: null }, true);
    return null;
  }

  try {
    const profile = await fetchMyProfile();

    if (!profile) {
      setState({ userProfile: null }, true);
      notifyError("Failed to load profile.");
      return null;
    }

    setState({ userProfile: profile }, true);
    return profile;
  } catch (error) {
    const err = error as Error;
    if (err?.name === "AbortError") {
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
 */
async function fetchUserProfile(username: string): Promise<UserProfile | null> {
  if (typeof username !== "string" || !username.trim()) {
    return null;
  }

  const encodedUsername = encodeURIComponent(username.trim());

  try {
    const data = await fetchUserProfileByUsername(username);

    if (!data || typeof data !== "object") {
      return null;
    }

    // Check for essential entity properties instead of requiring is_following
    return data.userid || data.id || data.username ? data : null;
  } catch (error) {
    const err = error as Error;
    if (err?.name === "AbortError") {
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
 */
async function fetchUserProfileData(
  username: string,
  entityType: string
): Promise<unknown> {
  if (typeof username !== "string" || !username.trim()) {
    throw new Error("Username is required.");
  }

  if (typeof entityType !== "string" || !entityType.trim()) {
    throw new Error("Entity type is required.");
  }

  const encodedUsername = encodeURIComponent(username.trim());
  const encodedEntityType = encodeURIComponent(entityType.trim());

  try {
    return await fetchUserProfileDataApi(username, entityType);
  } catch (error) {
    const err = error as Error;
    if (err?.name === "AbortError") {
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