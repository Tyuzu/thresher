import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { navigate } from "../../routes/index.js";
import { apiFetch } from "../../api/api.js";
import { adspace } from "../home/homeHelpers.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";

export async function displayPosts(container, isLoggedIn) {
  container.replaceChildren();

  // Sidebar actions setup
  const actions = [];
  if (isLoggedIn) {
    actions.push(
      Button("Create Post", "posts-create-btn", { click: () => navigate("/create-post") }, "buttonx")
    );
  }

  const asideContent = createAsideContent({ title: "Actions", actions });

  // Main area initial render
  const mainHeader = [
    createElement("h1", {}, ["All Posts"]),
    adspace("inbody")
  ];

  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "posts-page"
  });

  container.append(layout);

  // Data fetching & List injection
  const mainElement = layout.querySelector(".layout-main");
  const list = createElement("div", { class: "posts-list" });

  try {
    const resp = await apiFetch("/posts?page=1&limit=100");
    const posts = Array.isArray(resp) ? resp : resp?.data || resp?.posts || [];

    if (!posts.length) {
      list.append(createElement("p", {}, ["No posts found."]));
    } else {
      posts.forEach((post, idx) => {
        list.append(createPostCard(post));
        if ((idx + 1) % 6 === 0) list.append(adspace("inlist"));
      });
    }
  } catch (err) {
    console.error("Failed to load posts", err);
    list.append(createElement("p", {}, ["Error loading posts."]));
  }

  mainElement.append(list);
}