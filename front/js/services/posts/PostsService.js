import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { navigate } from "../../routes/index.js";
import { apiFetch } from "../../api/api.js";
import { adspace } from "../../services/ads/newads.js";
import Imagex from "../../components/base/Imagex.js";
import Datex from "../../components/base/Datex.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";

export async function displayPosts(container, isLoggedIn) {
  container.replaceChildren();

  const PAGE_NAME = "posts";

  // Sidebar actions setup
  const asideChildren = [];
  if (isLoggedIn) {
    asideChildren.push(
      Button("Create Post", "posts-create-btn", { click: () => navigate("/create-post") }, "buttonx")
    );
  }

  // Sidebar Ad: 300x250 Medium Rectangle with 30s auto-refresh
  asideChildren.push(
    adspace("aside", PAGE_NAME, {
      width: 300,
      height: 250,
      refreshInterval: 30000
    })
  );

  const asideContent = createAsideContent({
    title: "Actions",
    children: asideChildren,
    showAd: false // Handled directly via asideChildren to prevent duplicate slots
  });

  // Main area initial render
  const mainHeader = [
    createElement("h1", {}, ["All Posts"]),
    adspace("inbody", PAGE_NAME, {
      width: 728,
      height: 90,
      refreshInterval: 45000
    })
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

        // Inject an in-list native ad every 5 post items
        if ((idx + 1) % 5 === 0) {
          list.append(
            adspace("inlist", PAGE_NAME, {
              width: "100%",
              height: 120
            })
          );
        }
      });
    }
  } catch (err) {
    console.error("Failed to load posts", err);
    list.append(createElement("p", {}, ["Error loading posts."]));
  }

  mainElement.append(list);
}

// ---------- CARD BUILDER ----------
function createPostCard(post) {
  const thumb = post.thumb
    ? resolveImagePath(EntityType.BLOGPOST, PictureType.THUMB, post.thumb)
    : "/default-thumb.png";

  const postThumb = Imagex({
    src: thumb,
    alt: post.title || "Post image",
    loading: "lazy",
    classes: "",
    style: "width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:4px;"
  });

  const postInfo = createElement("div", { class: "post-info" }, [
    createElement("h3", {}, [post.title || "Untitled"]),
    createElement("p", {}, [
      createElement("strong", {}, ["Category: "]),
      post.category || "-"
    ]),
    createElement("p", {}, [
      createElement("strong", {}, ["Subcategory: "]),
      post.subcategory || "-"
    ]),
    createElement("p", {}, [
      createElement("strong", {}, ["Posted on: "]),
      post.createdAt ? Datex(post.createdAt) : "-"
    ]),
    createElement("p", {}, [
      createElement("strong", {}, ["By: "]),
      post.username || "-"
    ])
  ]);

  const card = createElement("div", { class: "post-card" }, [
    postThumb,
    postInfo
  ]);

  return createElement(
    "a",
    {
      href: "#",
      events: {
        click: e => {
          e.preventDefault();
          navigate(`/post/${encodeURIComponent(post.postid)}`);
        }
      }
    },
    [card]
  );
}