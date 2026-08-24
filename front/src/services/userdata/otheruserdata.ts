import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import Imagex from "../../components/base/Imagex.js";
import type { EntityType, EntityItem } from "./types.js";

// Fetch user profile data for a specific entity type
export async function fetchUserProfileData(
  username: string,
  entityType: EntityType
): Promise<EntityItem[]> {
  try {
    const response = await apiFetch<EntityItem[]>(
      `/user/${username}/udata?entity_type=${entityType}`
    );
    return response;
  } catch (error) {
    console.error(`Error fetching ${entityType} data for user:`, error);
    throw error;
  }
}

// Renders posts in a 3-column grid
export async function othusrdata(kc: HTMLElement, userid: string): Promise<void> {
  const container = createElement("div", { class: "user-profile-container" });
  const grid = createElement("div", { class: "grid-container" });

  try {
    const posts = await fetchUserProfileData(userid, "feedpost");
    const displayPosts = posts;

    displayPosts.forEach((post) => {
      const postBox = createElement("div", { class: "grid-item" });

      const img = Imagex({
        src: post.image_url || "",
        alt: post.caption || "Post image",
        class: "grid-item-image"
      });

      postBox.appendChild(img);
      grid.appendChild(postBox);
    });

    container.appendChild(grid);
  } catch (error) {
    const err = error as Error;
    const errorMessage = createElement("p", {}, [`Error: ${err.message}`]);
    container.appendChild(errorMessage);
  }

  kc.appendChild(container);
}