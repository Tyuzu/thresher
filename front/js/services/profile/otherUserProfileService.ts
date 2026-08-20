import { fetchUserProfile } from "./fetchProfile.js";
import profilGen from "./renderUserProfile.ts";
import { attachProfileEventListeners } from "./displayMyProfile.js";
import { displayUserProfileData } from "../userdata/displayProfileData.js";
import Notify from "../../components/ui/Notify.js";

/* ============================================================
    DISPLAY OTHER USER PROFILE
============================================================ */

/**
 * Fetches and displays a specific user's profile view
 * @param {boolean} isLoggedIn 
 * @param {HTMLElement} content Container element to render into
 * @param {string} username Target username
 */
async function displayUserProfile(isLoggedIn, content, username) {
  if (!content) return;

  content.textContent = ""; // Clear existing container content

  try {
    const userProfile = await fetchUserProfile(username);

    if (userProfile) {
      // Pass displayUserProfileData directly as the callback dependency
      const profileElement = profilGen(userProfile, isLoggedIn, displayUserProfileData);
      content.appendChild(profileElement);
      attachProfileEventListeners(content);
    } else {
      const notFoundMessage = document.createElement("p");
      notFoundMessage.className = "error-message";
      notFoundMessage.textContent = "User not found.";
      content.appendChild(notFoundMessage);
    }
  } catch (error) {
    console.error("Failed to display user profile:", error);

    const errorMessage = document.createElement("p");
    errorMessage.className = "error-message";
    errorMessage.textContent = "Failed to load user profile. Please try again later.";
    content.appendChild(errorMessage);

    Notify("Error fetching user profile.", {
      type: "error",
      duration: 3000,
      dismissible: true
    });
  }
}

export { displayUserProfile, displayUserProfileData };