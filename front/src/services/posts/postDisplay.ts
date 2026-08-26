/* eslint-disable no-unused-vars */
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { fetchPostById } from "./api.js";
import { apiFetch } from "../../api/api.js";
import { navigate } from "../../routes/navigate.js";
import { formatRelativeTime } from "../../utils/dateUtils.js";
import { editPost } from "./createOrEditPost.js";
import { createCommentsSection } from "../comments/comments.js";
import { getState } from "../../state/state.js";
import { userProfileCard } from "./userProfileCard.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Notify from "../../components/ui/Notify.js";
import Imagex from "../../components/base/Imagex.js";
import { fetchUserMeta } from "../../utils/usersMeta.js";
import ZoomBox from "../../components/ui/zoomBox/ZoomBox.js";
import { renderRelatedPosts } from "./relatedPosts.js";

/* ---------------------- TYPES ---------------------- */
export interface TextBlock {
  type: "text";
  content?: string;
}

export interface ImageBlock {
  type: "image";
  url?: string;
  alt?: string;
}

export interface CodeBlock {
  type: "code";
  language?: string;
  content?: string;
}

export interface VideoBlock {
  type: "video";
  url?: string;
  caption?: string;
}

export type PostBlock = TextBlock | ImageBlock | CodeBlock | VideoBlock;

export interface Post {
  postid: string | number;
  title?: string;
  type?: string;
  category?: string;
  subcategory?: string;
  createdBy: string | number;
  username?: string;
  createdAt?: string | number | Date;
  updatedAt?: string | number | Date;
  referenceId?: string | number;
  hashtags?: string[];
  tags?: string[];
  blocks?: PostBlock[];
}

export interface UserState {
  userid: string | number;
  username?: string;
  [key: string]: unknown;
}

export interface UserMetaMap {
  [key: string | number]: {
    username?: string;
    [key: string]: unknown;
  };
}

// --- Shared constants ---
const PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

const lazyObserver: IntersectionObserver | null =
  "loading" in HTMLImageElement.prototype || typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            const img = entry.target as HTMLImageElement;
            const real = img.dataset.src;

            if (real) {
              img.src = real;
              img.removeAttribute("data-src");
              img.addEventListener(
                "load",
                () => {
                  img.style.opacity = "1";
                },
                { once: true }
              );
            }

            lazyObserver?.unobserve(img);
          });
        },
        { rootMargin: "200px 0px" }
      );

const avatarCache = new Map<string | number, string>();

function getAvatar(userId: string | number): string {
  if (!avatarCache.has(userId)) {
    avatarCache.set(userId, resolveImagePath(EntityType.USER, PictureType.THUMB, userId));
  }

  return avatarCache.get(userId)!;
}

function capitalize(value?: string | number | null): string {
  if (!value) {
    return "";
  }
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

function getPostHashtags(post?: Post | null): string[] {
  if (Array.isArray(post?.hashtags) && post.hashtags.length) {
    return post.hashtags;
  }

  if (Array.isArray(post?.tags) && post.tags.length) {
    return post.tags;
  }

  return [];
}

function renderCodeBlock(block: CodeBlock): HTMLElement {
  return createElement("pre", { class: "post-code" }, [
    createElement(
      "code",
      {
        "data-language": block.language || ""
      },
      [block.content || ""]
    )
  ]);
}

function renderVideoBlock(block: VideoBlock): HTMLElement {
  const wrapper = createElement("div", { class: "post-video" });

  const video = createElement("video", {
    controls: "true",
    preload: "metadata",
    src: block.url || ""
  });

  wrapper.appendChild(video);

  if (block.caption?.trim()) {
    wrapper.appendChild(
      createElement("p", { class: "video-caption" }, [block.caption.trim()])
    );
  }

  return wrapper;
}

function renderReference(post?: Post | null): HTMLElement | null {
  if (!post?.referenceId) {
    return null;
  }

  return createElement("div", { class: "post-reference" }, [
    createElement("strong", {}, ["Reference: "]),
    createElement("span", {}, [String(post.referenceId)])
  ]);
}

// --- Main Export ---
export async function displayPost(
  isLoggedIn: boolean,
  postId: string | number,
  container: HTMLElement
): Promise<void> {
  container.replaceChildren();

  const page = createElement("div", { class: "postpage" });

  let post: Post | undefined;
  try {
    const resp = await fetchPostById(postId);
    post = resp?.post as Post | undefined;
  } catch (err) {
    page.appendChild(renderError("Failed to load post."));
    container.appendChild(page);
    return;
  }

  if (!post) {
    page.appendChild(renderError("Post not found."));
    container.appendChild(page);
    return;
  }

  const userx = (await fetchUserMeta([String(post.createdBy)])) as UserMetaMap | undefined;
  post.username = userx?.[post.createdBy]?.username || "Anonymous";

  const frag = document.createDocumentFragment();

  frag.append(renderHeader(post));
  frag.append(renderBody(post));

  const refEl = renderReference(post);
  if (refEl) {
    frag.append(refEl);
  }

  const hashtags = getPostHashtags(post);
  if (hashtags.length) {
    frag.append(renderTags(hashtags));
  }

  frag.append(await renderProfile(post));

  const currentUser = getState("user") as UserState | undefined;
  if (isLoggedIn && currentUser && post.createdBy === currentUser.userid) {
    frag.append(renderPostActions(post.postid, isLoggedIn, page));
  }

  frag.append(renderComments(post));

  page.appendChild(frag);

  const relatedEl = await renderRelatedPosts(post);
  if (relatedEl) {
    page.appendChild(relatedEl);
  }

  container.appendChild(page);
}

// --- Renderers ---
function renderError(msg: string): HTMLElement {
  return createElement("p", {}, [msg]);
}

function renderHeader(post: Post): HTMLElement {
  const createdAt = post.createdAt ? formatRelativeTime(post.createdAt) : "";
  const updatedAt =
    post.updatedAt && post.createdAt && post.updatedAt !== post.createdAt
      ? formatRelativeTime(post.updatedAt)
      : "";

  return createElement("div", { class: "post-data" }, [
    createElement("h2", {}, [post.title || "Untitled"]),
    createElement("div", { class: "post-header-meta" }, [
      createElement(
        "span",
        { class: "post-type" },
        [capitalize(post.type || "standard")]
      )
    ]),
    createElement("p", { class: "post-meta" }, [
      `📁 ${post.category || "Uncategorized"} › ${post.subcategory || "General"} • `,
      `👤 ${post.username || "Anonymous"} • `,
      createdAt ? `🕒 ${createdAt}` : "",
      updatedAt ? ` • Edited ${updatedAt}` : ""
    ])
  ]);
}

function renderBody(post: Post): HTMLElement {
  const content = createElement("div", { class: "post-body" });
  const blocks = Array.isArray(post.blocks) ? post.blocks : [];
  const fragment = document.createDocumentFragment();

  let imageBuffer: ImageBlock[] = [];

  const flushImages = (): void => {
    if (!imageBuffer.length) {
      return;
    }

    fragment.append(renderImageGroup(imageBuffer));
    imageBuffer = [];
  };

  blocks.forEach((block) => {
    switch (block.type) {
      case "image":
        if (block.url) {
          imageBuffer.push(block);
        }
        break;

      case "text":
        flushImages();
        if (block.content?.trim()) {
          fragment.append(createElement("p", {}, [block.content.trim()]));
        }
        break;

      case "code":
        flushImages();
        if (block.content?.trim()) {
          fragment.append(renderCodeBlock(block));
        }
        break;

      case "video":
        flushImages();
        if (block.url?.trim()) {
          fragment.append(renderVideoBlock(block));
        }
        break;

      default:
        break;
    }
  });

  flushImages();

  if (!fragment.childNodes.length) {
    fragment.append(createElement("p", {}, ["No content"]));
  }

  content.append(fragment);
  return content;
}

function renderImageGroup(images: ImageBlock[]): HTMLElement {
  const group = createElement("div", { class: "image-group" });

  const mediaItems = images.map((img) =>
    resolveImagePath(EntityType.BLOGPOST, PictureType.PHOTO, img.url)
  );

  images.forEach((img, index) => {
    const thumbSrc = resolveImagePath(EntityType.BLOGPOST, PictureType.THUMB, img.url);

    const imgEl = Imagex({
      src: thumbSrc,
      alt: img.alt || `Post Image ${index + 1}`,
      classes: "post-image",
      dataset: { index: String(index) }
    });

    group.appendChild(imgEl);
  });

  group.addEventListener("click", (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const img = target?.closest<HTMLElement>(".post-image");
    if (!img || !img.dataset.index) {
      return;
    }

    const index = parseInt(img.dataset.index, 10);
    if (Number.isNaN(index)) {
      return;
    }

    ZoomBox(mediaItems, index);
  });

  return group;
}

function renderTags(tags: string[]): HTMLElement {
  return createElement(
    "div",
    { class: "post-tags" },
    tags.map((tag) =>
      createElement("span", { class: "tag" }, [`#${String(tag).trim()}`])
    )
  );
}

async function renderProfile(post: Post): Promise<HTMLElement> {
  const avatarUrl = getAvatar(post.createdBy);

  return await userProfileCard({
    username: post.username || "anonymous",
    bio: "",
    avatarUrl,
    postCount: 0,
    isFollowing: false,
    entityId: post.postid,
    entityType: EntityType.BLOGPOST,
    entityName: post.title
  });
}

function renderPostActions(
  postId: string | number,
  isLoggedIn: boolean,
  page: HTMLElement
): HTMLElement {
  const editBtn = Button({
    title: "✏️ Edit",
    classes: "buttonx btn-warning",
    events: {
      click: () => editPost(isLoggedIn, postId, page)
    }
  });

  const deleteBtn = Button({
    title: "🗑️ Delete",
    id: "delete-post",
    classes: "buttonx btn-danger",
    events: {
      click: async () => {
        if (!confirm("Are you sure you want to delete this post?")) {
          return;
        }

        try {
          await apiFetch(`/posts/post/${encodeURIComponent(postId)}`, "DELETE");
          Notify("Post deleted.", {
            type: "success",
            duration: 3000,
            dismissible: true
          });
          navigate("/posts");
        } catch (err) {
          Notify("Failed to delete post.", {
            type: "error",
            duration: 3000,
            dismissible: true
          });
          console.error(err);
        }
      }
    }
  });

  return createElement("div", { class: "post-actions" }, [editBtn, deleteBtn]);
}

function renderComments(post: Post): HTMLElement {
  const wrapper = createElement("div", { class: "post-comments" });

  const toggle = createElement(
    "button",
    { class: "toggle-comments btn btn-link" },
    ["💬 Show Comments"]
  ) as HTMLButtonElement;

  let commentsEl: HTMLElement | null = null;
  let visible = false;
  let loaded = false;

  toggle.addEventListener("click", async () => {
    if (!loaded) {
      try {
        const currentUser = getState("user") as UserState | undefined;
        commentsEl = await createCommentsSection(
          EntityType.BLOGPOST,
          post.postid,
          currentUser?.userid
        );

        if (commentsEl) {
          wrapper.appendChild(commentsEl);
        }
        loaded = true;
      } catch (err) {
        Notify("Failed to load comments.", {
          type: "error",
          duration: 3000,
          dismissible: true
        });
        console.error(err);
        return;
      }
    }

    if (commentsEl) {
      commentsEl.style.display = visible ? "none" : "";
    }
    toggle.textContent = visible ? "💬 Show Comments" : "💬 Hide Comments";
    visible = !visible;
  });

  wrapper.append(
    createElement("h4", {}, ["Comments"]),
    toggle
  );

  return wrapper;
}