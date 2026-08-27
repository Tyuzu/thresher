// profileUtils.ts

import Datex from "../../components/base/Datex";
import Button from "../../components/base/Button.js";
import { getState } from "../../state/state.js";
import { createProfileDetails, createStatistics, UserProfile } from "./profileGenHelpers.js";
import { createBanner } from "./bannerPicture.js";
import { createAvatar } from "./avatarPicture.js";
import { othusrdata } from "../userdata/otheruserdata.js";
import { createElement } from "../../components/createElement.js";

type LoadUserDataCallback = (
  isLoggedIn: boolean,
  container: HTMLElement,
  username: string
) => void | Promise<void>;

/* ============================================================
    FORMATTERS & HELPERS
============================================================ */

/**
 * Formats a date string into a Datex component instance or formatted string
 */
export function formatDate(dateString: string | Date | null | undefined): HTMLElement | string | null {
  if (!dateString) return null;
  try {
    return Datex(dateString);
  } catch (error) {
    console.error("Error formatting date with Datex:", error);
    return new Date(dateString).toLocaleString();
  }
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(string: string = ""): string {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/* ============================================================
    LOADING INDICATORS
============================================================ */

/**
 * Renders a loading message to a target container or default #content element
 */
export function showLoadingMessage(message: string, containerId: string = "content"): void {
  removeLoadingMessage();

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} not found to show loading message.`);
    return;
  }

  const loadingMsg = document.createElement("p");
  loadingMsg.id = "loading-msg";
  loadingMsg.className = "loading-message";
  loadingMsg.textContent = message;

  container.appendChild(loadingMsg);
}

/**
 * Removes active loading message from the DOM
 */
export function removeLoadingMessage(): void {
  const loadingMsg = document.getElementById("loading-msg");
  if (loadingMsg) {
    loadingMsg.remove();
  }
}

/* ============================================================
    MEDIA PREVIEWS
============================================================ */

/**
 * Previews an image file selection on a target image element
 * Uses URL.createObjectURL for superior memory management over FileReader
 */
export function previewAvatar(event: Event, previewId: string = "profile-picture-preview"): void {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0];
  const preview = document.getElementById(previewId) as HTMLImageElement | null;

  if (!preview) return;

  if (file) {
    // Revoke previous Object URL to prevent memory leaks if re-uploading
    if (preview.dataset.objectUrl) {
      URL.revokeObjectURL(preview.dataset.objectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    preview.src = objectUrl;
    preview.style.display = "block";
    preview.dataset.objectUrl = objectUrl;
  }
}

/* ============================================================
    HELPERS
============================================================ */

/** Helper function to append multiple child nodes safely */
function appendChildren(parent: HTMLElement | null, ...children: unknown[]): void {
  if (!parent) return;

  const validChildren = children
    .flat()
    .filter((child): child is Node | string => child instanceof Node || typeof child === "string");

  parent.append(...validChildren);
}

/* ============================================================
    PROFILE GENERATOR COMPONENT
============================================================ */

function profilGen(
  profile: UserProfile = {} as UserProfile,
  isLoggedIn: boolean = false,
  onLoadUserData: LoadUserDataCallback | null = null
): HTMLElement {
  const currentUser = getState("user") as UserProfile | undefined;
  const currentUserId = currentUser?.userid;
  
  const isCreator = Boolean(profile.userid && profile.userid === currentUserId);

  const profileContainer = createElement("div", {
    class: "profile-container hflex"
  });

  const section = createElement("section", {
    class: "channel vflex"
  });

  const suggs = createElement("section", {
    class: "followcon hflex"
  });

  // Append primary profile header elements
  appendChildren(
    section,
    createBanner(profile, isCreator),
    createAvatar(profile),
    createProfileDetails(profile, isLoggedIn),
    createStatistics(profile),
    suggs
  );

  // Render role-specific action or profile data sections
  if (isCreator) {
    const udata = createElement("div", { class: "udata-info" });

    const loadUserDataButton = Button({
      title: "Load UserData",
      id: "load-user-data",
      classes: "buttonx primary",
      type: "button",
      events: {
        click: () => {
          if (typeof onLoadUserData === "function") {
            onLoadUserData(isLoggedIn, udata, String(profile.username || profile.userid));
          }
        }
      }
    });

    appendChildren(section, loadUserDataButton, udata);
  } else {
    const kc = createElement("div");
    if (profile.userid) {
      othusrdata(kc, String(profile.userid));
    }
    appendChildren(section, kc);
  }

  profileContainer.appendChild(section);
  return profileContainer;
}

export default profilGen;