import { getState, setState } from "../../state/state.js";
import { updateImageWithCrop } from "../../utils/bannerEditor.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { handleError } from "../../utils/utils.js";
import Notify from "../../components/ui/Notify.js";
import Bannerx from "../../components/base/Bannerx.js";

interface UserProfile {
  userid?: string | number;
  username?: string;
  banner?: string;
  [key: string]: unknown;
}

interface BannerResponse {
  banner?: string;
  [key: string]: unknown;
}

/* ============================================================
    UPDATE BANNER
============================================================ */

export async function updateBanner(): Promise<boolean> {
  const profile = getState("userProfile") as UserProfile | undefined;

  if (!profile?.userid) {
    handleError("No user profile found. Cannot update banner.");
    return false;
  }

  try {
    const response = (await updateImageWithCrop({
      entityType: EntityType.USER,
      imageType: "banner",
      stateKey: "banner",
      stateEntityKey: "banner",
      previewElementId: "banner-picture-preview",
      pictureType: PictureType.BANNER,
      entityId: profile.userid
    })) as BannerResponse | null;

    if (!response?.banner) {
      throw new Error("No banner returned from server.");
    }

    const currentProfile = (getState("userProfile") as UserProfile) || {};

    setState(
      {
        userProfile: {
          ...currentProfile,
          banner: response.banner
        }
      },
      true
    );

    Notify("Banner updated successfully.", {
      type: "success",
      duration: 3000,
      dismissible: true
    });

    const preview = document.getElementById("banner-picture-preview") as HTMLImageElement | null;
    if (preview) {
      const basePath = resolveImagePath(
        EntityType.USER,
        PictureType.BANNER,
        response.banner
      );
      const separator = basePath.includes("?") ? "&" : "?";
      preview.src = `${basePath}${separator}t=${Date.now()}`;
    }

    return true;
  } catch (err) {
    console.error("Error updating banner:", err);
    handleError("Error updating banner. Please try again.");
    return false;
  }
}

/* ============================================================
    BANNER COMPONENT
============================================================ */

export function createBanner(profile: UserProfile = {} as UserProfile, isCreator: boolean = false): HTMLElement {
  return Bannerx({
    isCreator,
    bannerkey: profile.banner || "",
    banneraltkey: `Banner for ${profile.username || "User"}`,
    bannerentitytype: EntityType.USER,
    stateentitykey: "user",
    bannerentityid: profile.userid ? String(profile.userid) : ""
  });
}