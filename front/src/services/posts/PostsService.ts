import { createElement, ElementAttributes } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { navigate } from "../../routes/navigate.js";
import { adspace } from "../../services/ads/newads.js";
import { fetchPosts, type Post, type PostsApiResponse } from "./api.js";
import Imagex from "../../components/base/Imagex.js";
import Datex from "../../components/base/Datex.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";

/* ---------------------- TYPES ---------------------- */
export type PostsFetchResult = Post[] | PostsApiResponse;

export interface AsideSection {
  title?: string;
  content: HTMLElement;
  className?: string;
}

// --- Main Export ---
export async function displayPosts(
  container: HTMLElement,
  isLoggedIn: boolean
): Promise<void> {
  container.replaceChildren();

  const PAGE_NAME = "posts";

  // ---------- SIDEBAR SECTIONS ----------
  const actionButtons: HTMLElement[] = [];
  if (isLoggedIn) {
    actionButtons.push(
      Button({
        title: "Create Post",
        id: "posts-create-btn",
        classes: "buttonx",
        events: {
          click: (() => navigate("/create-post")) as EventListener
        }
      })
    );
  }

  const actionsWrapper: HTMLElement | null =
    actionButtons.length > 0
      ? createElement("div", { class: "aside-actions-group" }, actionButtons)
      : null;

  // Sidebar Ad component
  const sidebarAd = adspace("aside", PAGE_NAME, {
    layout: "vertical",
    width: 300,
    height: 250,
    refreshInterval: 30000
  });

  const sections: AsideSection[] = [];

  if (actionsWrapper) {
    sections.push({
      title: "Actions",
      content: actionsWrapper,
      className: "aside-actions-section"
    });
  }

  sections.push({
    content: sidebarAd,
    className: "aside-ad-section"
  });

  const asideContent = createAsideContent({
    title: "Posts Overview",
    sections,
    showAd: false, // Handled directly via custom section to prevent duplication
    page: PAGE_NAME
  });

  // ---------- MAIN HEADER & INBODY AD ----------
  const mainHeader: HTMLElement[] = [
    createElement("h1", {}, ["All Posts"]),
    adspace("inbody", PAGE_NAME, {
      layout: "horizontal",
      width: 728,
      height: 90,
      refreshInterval: 45000
    })
  ];

  // ---------- LAYOUT ----------
  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "posts-page"
  });

  container.append(layout);

  // ---------- DATA FETCHING & LIST INJECTION ----------
  const mainElement = layout.querySelector<HTMLElement>(".layout-main");
  const list = createElement("div", { class: "posts-list" });

  try {
    const resp = (await fetchPosts(1, 100)) as PostsFetchResult | undefined;
    
    let posts: Post[] = [];
    if (Array.isArray(resp)) {
      posts = resp;
    } else if (resp && typeof resp === "object") {
      posts = resp.data || resp.posts || [];
    }

    if (!posts.length) {
      list.append(createElement("p", {}, ["No posts found."]));
    } else {
      posts.forEach((post, idx) => {
        list.append(createPostCard(post));

        // Inject an in-list native ad every 5 post items
        if ((idx + 1) % 5 === 0) {
          list.append(
            adspace("inlist", PAGE_NAME, {
              layout: "vertical",
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

  if (mainElement) {
    mainElement.append(list);
  }
}

// ---------- CARD BUILDER ----------
function createPostCard(post: Post): HTMLElement {
  const thumb = post.thumb
    ? resolveImagePath(EntityType.BLOGPOST, PictureType.THUMB, post.thumb)
    : "/default-thumb.png";

  const postThumb = Imagex({
    src: thumb,
    alt: post.title || "Post image",
    loading: "lazy",
    classes: "",
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

  const linkAttributes: ElementAttributes = {
    href: "#",
    events: {
      click: ((e: Event) => {
        e.preventDefault();
        navigate(`/post/${encodeURIComponent(post.postid)}`);
      }) as EventListener
    }
  };

  return createElement("a", linkAttributes, [card]);
}