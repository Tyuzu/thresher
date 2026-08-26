import { getState, setState } from "../../state/state.js";
import { handleError } from "../../utils/utils.js";
import { updateProfileData, type UserProfile } from "./api.js";
import { navigate } from "../../routes/navigate.js";
import { showLoadingMessage, removeLoadingMessage } from "./profileHelpers.js";
import { generateFormField } from "./generators.js";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Notify from "../../components/ui/Notify.js";

/* ============================================================
    EDIT PROFILE VIEW
============================================================ */

/**
 * Renders the edit profile form into the target container
 */
async function editProfile(
  content: HTMLElement | null,
  onDelete?: () => void
): Promise<void> {
  if (!content) return;

  content.replaceChildren(); // Clear existing content

  const profile = getState("userProfile") as UserProfile | undefined;
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
  }) as HTMLFormElement;

  // Generate form fields mapped directly to profile schema keys
  const fields = [
    generateFormField("Username", "username", "text", username || ""),
    generateFormField("Name", "name", "text", name || ""),
    generateFormField("Email", "email", "email", email || ""),
    generateFormField("Bio", "bio", "textarea", bio || ""),
    generateFormField("Phone Number", "phone_number", "text", phone_number || "")
  ];

  fields.forEach((field) => {
    if (field) form.appendChild(field);
  });

  // Submit button
  const updateBtn = Button({
    title: "Update Profile",
    id: "update-profile-btn",
    classes: "buttonx primary",
    type: "submit"
  }) as HTMLButtonElement;

  // Cancel button
  const cancelBtn = Button({
    title: "Cancel",
    id: "cancel-profile-btn",
    classes: "buttonx secondary",
    type: "button",
    events: {
      click: (e: Event) => {
        e.preventDefault();
        Notify("Profile editing canceled.", {
          type: "info",
          duration: 3000,
          dismissible: true
        });
        navigate("/profile");
      }
    }
  }) as HTMLButtonElement;

  form.appendChild(updateBtn);
  form.appendChild(cancelBtn);

  // Form submit event handler
  form.addEventListener("submit", (e: SubmitEvent) => {
    e.preventDefault();
    updateProfile(new FormData(form));
  });

  // Delete button
  const deleteBtn = Button({
    title: "Delete Profile",
    id: "btndelprof",
    classes: "btn delete-btn",
    type: "button",
    "data-action": "delete-profile",
    events: {
      click: (e: Event) => {
        e.preventDefault();
        if (typeof onDelete === "function") {
          onDelete();
        } else {
          content.dispatchEvent(new CustomEvent("edit-profile:delete", { bubbles: true }));
        }
      }
    }
  }) as HTMLButtonElement;

  content.append(title, form, deleteBtn);
}

/* ============================================================
    UPDATE PROFILE API ACTION
============================================================ */

/**
 * Handles profile update submission
 */
async function updateProfile(formData: FormData): Promise<void> {
  if (!getState("token")) {
    Notify("Please log in to update your profile.", {
      type: "warning",
      duration: 3000,
      dismissible: true
    });
    return;
  }

  const currentProfile = (getState("userProfile") as Record<string, unknown>) || {};
  const updatedFields: Record<string, string> = {};

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

    const updatedProfile = await updateProfileData(updatedFields);

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