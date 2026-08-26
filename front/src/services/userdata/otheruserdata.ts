import { createElement } from "../../components/createElement.js";
import Imagex from "../../components/base/Imagex.js";
import { fetchUserProfileData } from "./api.js";
import type { EntityItem } from "./types.js";

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