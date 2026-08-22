// profileAvatar.js

import { getState, setState } from "../../state/state.js";
import {
  resolveImagePath,
  EntityType,
  PictureType
} from "../../utils/imagePaths.js";
import { createElement } from "../../components/createElement.js";
import { handleError } from "../../utils/utils.js";
import SightBox from "../../components/ui/Sightbox_zoom.js";
import Notify from "../../components/ui/Notify.js";
import { updateImageWithCrop } from "../../utils/bannerEditor.js";

/* ============================================================
    HELPERS
============================================================ */

/** Extract response array safely regardless of standard wrappers */
function normalizeResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

/* ============================================================
    UPDATE AVATAR
============================================================ */

export async function updateAvatar() {
  const profile = getState("userProfile");

  if (!profile?.userid) {
    handleError("No user profile found. Cannot update avatar.");
    return false;
  }

  try {
    const response = await updateImageWithCrop({
      entityType: EntityType.USER,
      imageType: "avatar",
      stateKey: "avatar",
      previewElementId: "avatar-picture-preview",
      pictureType: PictureType.THUMB,
      entityId: profile.userid
    });

    if (!response) return false;

    const attachments = normalizeResponseData(response);
    const avatarAttachment = attachments.find(
      (item) => (item.key || item.Key) === "avatar"
    );

    if (!avatarAttachment?.filename) {
      throw new Error("No valid avatar returned from server.");
    }

    const currentProfile = getState("userProfile") || {};

    setState(
      {
        userProfile: {
          ...currentProfile,
          avatar: avatarAttachment.filename
        }
      },
      true
    );

    Notify("Avatar updated successfully.", {
      type: "success",
      duration: 3000,
      dismissible: true
    });

    return true;
  } catch (err) {
    console.error("Error updating avatar:", err);
    handleError("Error updating avatar. Please try again.");
    return false;
  }
}

/* ============================================================
    AVATAR COMPONENT
============================================================ */

export function createAvatar(profile = {}) {
  const profileArea = createElement("div", { class: "profile_area" });
  const thumb = createElement("span", { class: "thumb" });

  const userId = profile.userid || "";
  const thumbSrc = resolveImagePath(EntityType.USER, PictureType.THUMB, `${userId}`);
  const fullSrc = resolveImagePath(EntityType.USER, PictureType.PHOTO, userId);

  // Setup Image
  const img = new Image();
  img.src = thumbSrc;
  img.alt = "Profile Picture";
  img.loading = "lazy";
  img.classList.add("imgful");
  img.onerror = () => {
    img.onerror = null; // Prevent infinite fallback loops if asset is missing
    img.src = "/assets/icon-192.png";
  };

  thumb.appendChild(img);

  if (thumbSrc) {
    thumb.addEventListener("click", () => SightBox(fullSrc, "image"));
  }

  profileArea.appendChild(thumb);

  // Edit button for active user
  const currentUserId = getState("user")?.userid;
  if (userId && userId === currentUserId) {
    const editBtn = createElement(
      "button",
      { class: "edit-profile-pic", "aria-label": "Edit Profile Picture" },
      ["P"]
    );

    editBtn.addEventListener("click", updateAvatar);
    profileArea.appendChild(editBtn);
  }

  return profileArea;
}