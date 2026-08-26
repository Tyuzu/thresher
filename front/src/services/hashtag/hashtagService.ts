import { createElement } from "../../components/createElement.js";
import { reportEntity } from "../reporting/reporting.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createTabs } from "../../utils/persistTabs.js";
import Imagex from "../../components/base/Imagex.js";
import {
    fetchHashtagTopPosts,
    fetchHashtagLatestPosts,
    fetchHashtagPeople,
    fetchHashtagMedia,
    type HashtagPostItem,
    type HashtagUserItem
} from "./api.js";

/* =========================
   TYPES & INTERFACES
========================= */

export interface PostItem {
    postid: string | number;
    title?: string;
    type?: "image" | "video" | string;
    media_url?: string | string[];
    [key: string]: unknown;
}

export interface UserItem {
    username: string;
    display_name?: string;
    [key: string]: unknown;
}

/* =========================
   CONFIG
========================= */

const DEFAULT_LIMIT = 20;

/* =========================
   TAB RENDERERS
========================= */

async function renderTopTab(
    container: HTMLElement,
    hashtag: string,
    page: number = 0,
    limit: number = DEFAULT_LIMIT
): Promise<void> {
    const loading = createElement("p", { class: "loading" }, ["Loading top posts..."]);
    container.appendChild(loading);

    try {
        const posts = await fetchHashtagTopPosts(hashtag, page, limit);
        container.textContent = "";

        if (!Array.isArray(posts) || !posts.length) {
            container.appendChild(
                createElement("div", { class: "empty-state" }, [
                    createElement("p", {}, ["No top posts found for this hashtag."])
                ])
            );
            return;
        }

        posts.forEach(post => {
            const item = createElement("div", { class: "post-item" }, [
                createElement("a", { href: `/feedpost/${post.postid}` }, [post.title || "View post"])
            ]);
            container.appendChild(item);
        });
    } catch (_err) {
        container.textContent = "";
        container.appendChild(
            createElement("div", { class: "error-state" }, [
                createElement("p", {}, ["⚠️ Failed to load top posts."])
            ])
        );
    }
}

async function renderLatestTab(
    container: HTMLElement,
    hashtag: string,
    page: number = 0,
    limit: number = DEFAULT_LIMIT
): Promise<void> {
    const loading = createElement("p", { class: "loading" }, ["Loading latest posts..."]);
    container.appendChild(loading);

    try {
        const posts = await fetchHashtagLatestPosts(hashtag, page, limit);
        container.textContent = "";

        if (!Array.isArray(posts) || !posts.length) {
            container.appendChild(
                createElement("div", { class: "empty-state" }, [
                    createElement("p", {}, ["No recent posts found for this hashtag."])
                ])
            );
            return;
        }

        posts.forEach(post => {
            const item = createElement("div", { class: "post-item" }, [
                createElement("a", { href: `/feedpost/${post.postid}` }, [post.title || "View post"])
            ]);
            container.appendChild(item);
        });
    } catch (_err) {
        container.textContent = "";
        container.appendChild(
            createElement("div", { class: "error-state" }, [
                createElement("p", {}, ["⚠️ Failed to load latest posts."])
            ])
        );
    }
}

async function renderPeopleTab(
    container: HTMLElement,
    hashtag: string,
    page: number = 0,
    limit: number = DEFAULT_LIMIT
): Promise<void> {
    const loading = createElement("p", { class: "loading" }, ["Loading people..."]);
    container.appendChild(loading);

    try {
        const people = await fetchHashtagPeople(hashtag, page, limit);
        container.textContent = "";

        if (!Array.isArray(people) || !people.length) {
            container.appendChild(
                createElement("div", { class: "empty-state" }, [
                    createElement("p", {}, ["No people found using this hashtag."])
                ])
            );
            return;
        }

        people.forEach(user => {
            const item = createElement("div", { class: "user-item" }, [
                createElement("a", { href: `/profile/${user.username}` }, [user.display_name || user.username])
            ]);
            container.appendChild(item);
        });
    } catch (_err) {
        container.textContent = "";
        container.appendChild(
            createElement("div", { class: "error-state" }, [
                createElement("p", {}, ["⚠️ Failed to load people."])
            ])
        );
    }
}

async function renderMediaTab(
    container: HTMLElement,
    hashtag: string,
    page: number = 0,
    limit: number = DEFAULT_LIMIT
): Promise<void> {
    const loading = createElement("p", { class: "loading" }, ["Loading media..."]);
    container.appendChild(loading);

    try {
        const posts = await fetchHashtagMedia(hashtag, page, limit);
        container.textContent = "";

        if (!Array.isArray(posts) || !posts.length) {
            container.appendChild(
                createElement("div", { class: "empty-state" }, [
                    createElement("p", {}, ["No media found for this hashtag."])
                ])
            );
            return;
        }

        const grid = createElement("div", { class: "hashtag-grid" }, []);
        posts.forEach(post => {
            const mediaUrls = Array.isArray(post.media_url)
                ? post.media_url
                : post.media_url ? [post.media_url] : [];

            if (!mediaUrls.length) {
                return;
            }

            const thumbSrc =
                post.type === "video"
                    ? resolveImagePath(EntityType.FEED, PictureType.VIDEO, mediaUrls[0])
                    : resolveImagePath(EntityType.FEED, PictureType.PHOTO, mediaUrls[0]);

            const card = createElement(
                "a",
                { class: "grid-item", href: `/feedpost/${post.postid}` },
                [
                    Imagex({
                        src: thumbSrc,
                        alt: post.title || "Post",
                        loading: "lazy"
                    }) as HTMLElement
                ]
            );

            grid.appendChild(card);
        });
        container.appendChild(grid);
    } catch (_err) {
        container.textContent = "";
        container.appendChild(
            createElement("div", { class: "error-state" }, [
                createElement("p", {}, ["⚠️ Failed to load media. Please try again later."])
            ])
        );
    }
}

/* =========================
   MAIN ENTRY POINT
========================= */

export async function displayHashtag(
    contentContainer: HTMLElement,
    hashtag: string,
    isLoggedIn: boolean
): Promise<void> {
    // Clear old content
    while (contentContainer.firstChild) {
        contentContainer.removeChild(contentContainer.firstChild);
    }

    // Page wrapper
    const hashcon = createElement("div", { id: "hashcon", class: "hashtag-page" }, []);

    // Header row
    const header = createElement("div", { class: "hashtag-header hvflex-sb" }, [
        createElement("h2", { class: "hashtag-title" }, [`#${hashtag}`])
    ]);

    if (isLoggedIn) {
        const reportBtn = createElement("button", { class: "report-btn" }, ["Report"]);
        reportBtn.addEventListener("click", () => {
            reportEntity(String(hashtag), "hashtag");
        });
        header.appendChild(reportBtn);
    }

    hashcon.appendChild(header);

    // Tabs configuration
    const tabs = createTabs(
        [
            {
                id: "top",
                title: "Top",
                render: async (container: HTMLElement) => renderTopTab(container, hashtag)
            },
            {
                id: "latest",
                title: "Latest",
                render: async (container: HTMLElement) => renderLatestTab(container, hashtag)
            },
            {
                id: "people",
                title: "People",
                render: async (container: HTMLElement) => renderPeopleTab(container, hashtag)
            },
            {
                id: "media",
                title: "Media",
                render: async (container: HTMLElement) => renderMediaTab(container, hashtag)
            }
        ],
        `hashtag-${hashtag}`,
        "top"
    ) as HTMLElement;

    hashcon.appendChild(tabs);
    contentContainer.appendChild(hashcon);
}