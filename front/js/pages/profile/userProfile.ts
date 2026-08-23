
import "../../../css/inistyles/profilexx.css";
import "../../../css/inistyles/udata.css";
import { displayProfile } from "../../services/profile/displayMyProfile.js";
import { displayUserProfile } from "../../services/profile/otherUserProfileService.js";

export async function MyProfile(
  isLoggedIn: boolean,
  contentContainer: HTMLElement,
  k?: unknown
): Promise<void> {
  contentContainer.innerHTML = "";
  const content = document.createElement("div");
  content.className = "profilepage";
  contentContainer.appendChild(content);
  displayProfile(isLoggedIn, content);
}

export async function UserProfile(
  isLoggedIn: boolean,
  username: string,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  const content = document.createElement("div");
  content.className = "profilepage";
  contentContainer.appendChild(content);
  displayUserProfile(isLoggedIn, content, username);
}