import { fetchUserProfile } from "./fetchProfile.js";
import profilGen from "./profilegen.js";
import { attachProfileEventListeners } from "./displayMyProfile.js";
import { displayUserProfileData } from "../userdata/displayProfileData.js";
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.js";

/* ============================================================
    DISPLAY OTHER USER PROFILE
============================================================ */

/**
 * Fetches and displays a specific user's profile view
 */
async function displayUserProfile(
  isLoggedIn: boolean,
  content: HTMLElement | null,
  username: string
): Promise<void> {
  if (!content) return;

  content.replaceChildren(); // Clear existing container content

  try {
    const userProfile = await fetchUserProfile(username);

    if (userProfile) {
      // Pass displayUserProfileData directly as the callback dependency
      const profileElement = profilGen(userProfile, isLoggedIn, displayUserProfileData);
      content.appendChild(profileElement);
      attachProfileEventListeners(content);
    } else {
      const notFoundMessage = createElement(
        "p",
        { class: "error-message" },
        "User not found."
      );
      content.appendChild(notFoundMessage);
    }
  } catch (error) {
    console.error("Failed to display user profile:", error);

    const errorMessage = createElement(
      "p",
      { class: "error-message" },
      "Failed to load user profile. Please try again later."
    );
    content.appendChild(errorMessage);

    Notify("Error fetching user profile.", {
      type: "error",
      duration: 3000,
      dismissible: true
    });
  }
}

export { displayUserProfile };