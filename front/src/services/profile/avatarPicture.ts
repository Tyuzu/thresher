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

export interface ImageAttachment {
  key?: string;
  Key?: string;
  filename?: string;
  [key: string]: any; // Allows for additional server response fields
}

interface UserProfile {
  userid?: string | number;
  username?: string;
  avatar?: string;
  [key: string]: unknown;
}

interface AttachmentItem {
  key?: string;
  Key?: string;
  filename?: string;
}

/* ============================================================
    HELPERS
============================================================ */

/** Extract response array safely regardless of standard wrappers */
function normalizeResponseData(response: unknown): AttachmentItem[] {
  if (Array.isArray(response)) return response as AttachmentItem[];
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    Array.isArray((response as { data: unknown }).data)
  ) {
    return (response as { data: AttachmentItem[] }).data;
  }
  return [];
}
/* ============================================================
    UPDATE AVATAR
============================================================ */

export async function updateAvatar(): Promise<boolean> {
  const profile = getState("userProfile") as UserProfile | undefined;

  if (!profile?.userid) {
    handleError("No user profile found. Cannot update avatar.");
    return false;
  }

  try {
    const response = await updateImageWithCrop({
      entityType: EntityType.USER,
      imageType: "avatar",
      stateKey: "avatar",
      stateEntityKey: "userProfile",
      previewElementId: "avatar-picture-preview",
      pictureType: PictureType.THUMB,
      entityId: profile.userid
    });

    if (!response) return false;

    // Normalize response to pull updated filename for global state sync
    const attachments: ImageAttachment[] = Array.isArray(response)
      ? response
      : Array.isArray((response as any)?.data)
        ? (response as any).data
        : [];

    const avatarAttachment = attachments.find(
      (item) => (item.key || item.Key) === "avatar" || item.filename
    );

    if (avatarAttachment?.filename) {
      const currentProfile = (getState("userProfile") as UserProfile) || {};
      setState(
        {
          userProfile: {
            ...currentProfile,
            avatar: avatarAttachment.filename
          }
        },
        true
      );
    }

    return true;
  } catch (err) {
    console.error("Error updating avatar:", err);
    return false;
  }
}

/* ============================================================
    AVATAR COMPONENT
============================================================ */

export function createAvatar(profile: UserProfile = {} as UserProfile): HTMLElement {
  const profileArea = createElement("div", { class: "profile_area" });
  const thumb = createElement("span", { class: "thumb" });

  const userId = profile.userid ? String(profile.userid) : "";
  const thumbSrc = resolveImagePath(EntityType.USER, PictureType.THUMB, userId);
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
  const currentUserId = (getState("user") as UserProfile | undefined)?.userid;
  if (userId && userId === String(currentUserId)) {
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