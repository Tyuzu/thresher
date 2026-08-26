import { navigate } from "../../routes/navigate.js";
import { fetchFollowSuggestions, type SuggestedUser } from "./api.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.js";
import Imagex from "../../components/base/Imagex.js";

/* ============================================================
    DISPLAY FOLLOW SUGGESTIONS
============================================================ */

/**
 * Renders follow suggestions into the designated section
 */
async function displayFollowSuggestions(
  userid: string | number,
  suggestionsSection: HTMLElement | null
): Promise<void> {
  if (!suggestionsSection) return;

  suggestionsSection.replaceChildren(); // Clear previous content

  try {
    const suggestions = await fetchFollowSuggestions(userid);

    if (Array.isArray(suggestions) && suggestions.length > 0) {
      const heading = createElement("h3", {}, ["Suggested Users to Follow:"]);
      const suggestionsList = createElement("div", { id: "suggestions-list" });

      suggestions.forEach((user) => {
        const listItem = createElement("div", { class: "suggestion-item" });

        // Profile Picture
        const profilePic = Imagex({
          src: resolveImagePath(EntityType.USER, PictureType.THUMB, user.userid),
          class: "circle padd-4"
        }) as HTMLImageElement;
        profilePic.alt = `${user.username || "User"}'s profile`;
        profilePic.setAttribute("loading", "lazy");

        // Username
        const username = createElement("span", { class: "username" }, [
          `@${user.username || "user"}`
        ]);

        // Bio
        const bio = createElement("span", { class: "bio" }, [user.bio || ""]);

        // Action Button
        const profileBtn = createElement(
          "button",
          { class: "follow-btn", "data-userid": String(user.userid) },
          ["View Profile"]
        );
        profileBtn.addEventListener("click", () =>
          navigate(`/user/${user.username}`)
        );

        // Append elements
        listItem.append(profilePic, username, bio, profileBtn);
        suggestionsList.appendChild(listItem);
      });

      suggestionsSection.append(heading, suggestionsList);
    }
  } catch (error) {
    console.error("Error loading follow suggestions:", error);

    const errorMessage = createElement("p", { class: "error-message" }, [
      "Failed to load suggestions."
    ]);
    suggestionsSection.appendChild(errorMessage);

    Notify("Error loading follow suggestions.", {
      type: "error",
      duration: 3000,
      dismissible: true
    });
  }
}

export { displayFollowSuggestions };