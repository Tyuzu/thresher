// editProfile.js

import { getState, setState } from "../../state/state.js";
import { apiFetch } from "../../api/api.js";
import { handleError } from "../../utils/utils.js";
import { navigate } from "../../routes/index.js";
import { showLoadingMessage, removeLoadingMessage } from "./profileHelpers.js";
import { generateFormField } from "./generators.js";
import { deleteProfile } from "./displayMyProfile.js";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Notify from "../../components/ui/Notify.mjs";

/* ============================================================
    EDIT PROFILE VIEW
============================================================ */

/**
 * Renders the edit profile form into the target container
 * @param {HTMLElement} content 
 */
async function editProfile(content) {
  if (!content) return;

  content.replaceChildren(); // Clear existing content

  const profile = getState("userProfile");
  if (!profile) {
    Notify("Please log in to edit your profile.", {
      type: "warning",
      duration: 3000,
      dismissible: true
    });
    return;
  }

  const { username, name, email, bio, phone_number } = profile;

  const title = createElement("h2", {}, ["Edit Profile"]);

  const form = createElement("form", {
    id: "edit-profile-form",
    class: "create-section"
  });

  // Generate form fields mapped directly to profile schema keys
  const fields = [
    generateFormField("Username", "username", "text", username),
    generateFormField("Name", "name", "text", name),
    generateFormField("Email", "email", "email", email),
    generateFormField("Bio", "bio", "textarea", bio || ""),
    generateFormField("Phone Number", "phone_number", "text", phone_number || "")
  ];

  fields.forEach((field) => {
    if (field) form.appendChild(field);
  });

  // Submit button
  const updateBtn = Button(
    "Update Profile",
    "update-profile-btn",
    null,
    "buttonx primary"
  );
  updateBtn.type = "submit";

  // Cancel button
  const cancelBtn = Button(
    "Cancel",
    "cancel-profile-btn",
    {
      click: (e) => {
        e.preventDefault();
        Notify("Profile editing canceled.", {
          type: "info",
          duration: 3000,
          dismissible: true
        });
        navigate("/profile");
      }
    },
    "buttonx secondary"
  );
  cancelBtn.type = "button";

  form.appendChild(updateBtn);
  form.appendChild(cancelBtn);

  // Form submit event handler
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    updateProfile(new FormData(form));
  });

  // Delete button
  const deleteBtn = Button(
    "Delete Profile",
    "btndelprof",
    {
      click: (e) => {
        e.preventDefault();
        deleteProfile();
      }
    },
    "btn delete-btn"
  );
  deleteBtn.type = "button";
  deleteBtn.setAttribute("data-action", "delete-profile");

  content.append(title, form, deleteBtn);
}

/* ============================================================
    UPDATE PROFILE API ACTION
============================================================ */

/**
 * Handles profile update submission
 * @param {FormData} formData 
 */
async function updateProfile(formData) {
  if (!getState("token")) {
    Notify("Please log in to update your profile.", {
      type: "warning",
      duration: 3000,
      dismissible: true
    });
    return;
  }

  const currentProfile = getState("userProfile") || {};
  const updatedFields = {};

  // Compare input values against current state to send only changed fields
  for (const [key, value] of formData.entries()) {
    const trimmedValue = String(value).trim();
    const currentValue = String(currentProfile[key] || "").trim();

    if (trimmedValue !== currentValue) {
      updatedFields[key] = trimmedValue;
    }
  }

  if (Object.keys(updatedFields).length === 0) {
    Notify("No changes were made to the profile.", {
      type: "info",
      duration: 3000,
      dismissible: true
    });
    return;
  }

  showLoadingMessage("Updating...");

  try {
    const updateFormData = new FormData();
    Object.entries(updatedFields).forEach(([key, val]) =>
      updateFormData.append(key, val)
    );

    const updatedProfile = await apiFetch(
      "/profile/edit",
      "PUT",
      updateFormData
    );

    if (!updatedProfile) {
      throw new Error("No response received for the profile update.");
    }

    const mergedProfile = { ...currentProfile, ...updatedProfile };
    setState({ userProfile: mergedProfile }, true);

    Notify("Profile updated successfully.", {
      type: "success",
      duration: 3000,
      dismissible: true
    });

    navigate("/profile");
  } catch (error) {
    console.error("Error updating profile:", error);
    handleError("Error updating profile. Please try again.");
  } finally {
    removeLoadingMessage();
  }
}

export { editProfile };