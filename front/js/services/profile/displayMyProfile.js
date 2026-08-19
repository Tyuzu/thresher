import { getState } from "../../state/state.js";
import { apiFetch } from "../../api/api.js";
import { navigate } from "../../routes/index.js";
import { logout } from "../auth/authService.js";
import { fetchProfile } from "./fetchProfile.js";
import profilGen from "./renderUserProfile.js";
import { editProfile } from "./editProfile.js";
import Notify from "../../components/ui/Notify.mjs";

/* ============================================================
    DISPLAY PROFILE
============================================================ */

/**
 * Display the profile content in the profile section container
 * @param {boolean} isLoggedIn 
 * @param {HTMLElement} content 
 */
async function displayProfile(isLoggedIn, content) {
  if (!content) return;

  content.textContent = ""; // Clear existing content

  if (!isLoggedIn) {
    navigate("/login");
    return;
  }

  try {
    const profile = await fetchProfile(isLoggedIn);

    if (profile) {
      const profileElement = profilGen(profile, isLoggedIn);
      content.appendChild(profileElement);
      attachProfileEventListeners(content);
    } else {
      const loginMessage = document.createElement("p");
      loginMessage.textContent = "Please log in to see your profile.";
      content.appendChild(loginMessage);
    }
  } catch (error) {
    console.error("Error displaying profile:", error);
    const errorMessage = document.createElement("p");
    errorMessage.textContent = "Failed to load profile. Please try again later.";
    content.appendChild(errorMessage);
  }
}

/* ============================================================
    EVENT LISTENERS
============================================================ */

/**
 * Attach event listeners localized to the profile container element
 * @param {HTMLElement} content 
 */
function attachProfileEventListeners(content) {
  if (!content) return;

  const editButton = content.querySelector('[data-action="edit-profile"]');
  const deleteButton = content.querySelector('[data-action="delete-profile"]');

  if (editButton) {
    editButton.addEventListener("click", () => editProfile(content));
  }

  if (deleteButton) {
    deleteButton.addEventListener("click", deleteProfile);
  }
}

/* ============================================================
    DELETE PROFILE
============================================================ */

async function deleteProfile() {
  if (!getState("token")) {
    Notify("Please log in to delete your profile.", {
      type: "warning",
      duration: 3000,
      dismissible: true
    });
    return;
  }

  const confirmDelete = window.confirm(
    "Are you sure you want to delete your profile? This action cannot be undone."
  );

  if (!confirmDelete) return;

  try {
    await apiFetch("/profile/delete", "DELETE");

    Notify("Profile deleted successfully.", {
      type: "success",
      duration: 3000,
      dismissible: true
    });

    logout(true);
  } catch (error) {
    Notify(`Failed to delete profile: ${error.message || "Unknown error"}`, {
      type: "error",
      duration: 3000,
      dismissible: true
    });
  }
}

export { displayProfile, deleteProfile, attachProfileEventListeners };