import { createPostHeader } from "./helpers.js";
import { createActions } from "./actions.js";
import { createElement } from "../../../components/createElement.js";
import { RenderImagePost } from "../renderImagePost.js";
import { RenderVideoPost } from "../renderVideoPost.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { getState } from "../../../state/state.js";
import Datex from "../../../components/base/Datex.js";

/**
 * Renders one or more posts into a container.
 * @param {Object|Object[]} posts
 * @param {HTMLElement} postsContainer
 * @param {Object} metadataMap - keyed by postId
 */
export async function renderPost(posts, postsContainer, metadataMap = {}) {
    try {
        if (!postsContainer || !(postsContainer instanceof HTMLElement)) {
            throw new Error("postsContainer must be a valid HTMLElement");
        }

        if (!posts) {
            console.warn("renderPost received empty posts parameter");
            return;
        }

        const postsList = Array.isArray(posts) ? posts : [posts];
        
        let isLoggedIn = false;
        let user = null;
        
        try {
            isLoggedIn = Boolean(getState("token"));
            user = getState("user");
        } catch (stateErr) {
            console.warn("Failed to retrieve application state:", stateErr);
        }

        for (const post of postsList) {
            try {
                if (!post || typeof post !== "object" || !post.postid) {
                    console.warn("Skipping invalid post structure:", post);
                    continue;
                }

                const isCreator = isLoggedIn && Boolean(user) && user === post.userid;

                const postElement = createElement("article", {
                    class: "feed-item",
                    id: `post-${post.postid}`,
                    "date-is": safeDate(post.timestamp)
                });

                // ---------- MEDIA ----------
                const mediaContainerId = `post-media-${post.postid}`;
                const mediaContainer = createElement("div", {
                    id: mediaContainerId,
                    class: "post-media"
                });

                const media = normalizeMedia(post);

                const renderers = {
                    image: async () => {
                        try {
                            if (media.length) {
                                await RenderImagePost(mediaContainer, media);
                            } else {
                                fallbackText(mediaContainer, "No image available.");
                            }
                        } catch (err) {
                            console.error(`Image rendering failed for post ${post.postid}:`, err);
                            fallbackText(mediaContainer, "Failed to load image post.");
                        }
                    },

                    video: async () => {
                        if (!media.length) {
                            fallbackText(mediaContainer, "No video available.");
                            return;
                        }

                        const videoWrapper = createElement("div", {
                            class: "video-wrapper"
                        });

                        try {
                            const videos = media.map(m =>
                                resolveImagePath(EntityType.FEED, PictureType.VIDEO, m)
                            );

                            const posterPath = resolveImagePath(
                                EntityType.FEED,
                                PictureType.POSTER,
                                `${post.thumbnail || media[0]}`
                            );

                            await RenderVideoPost(
                                videoWrapper,
                                videos,
                                media,
                                post.resolutions || [],
                                [],
                                posterPath
                            );
                        } catch (err) {
                            console.error(`RenderVideoPost execution failed for post ${post.postid}:`, err);
                            fallbackText(mediaContainer, "Video failed to load.");
                            return;
                        }

                        const videoEl = videoWrapper.querySelector("video");
                        if (!videoEl) {
                            console.warn(`No video element generated for post ${post.postid}`);
                            fallbackText(mediaContainer, "Video unavailable.");
                            return;
                        }

                        videoWrapper.dataset.wrapperId = `vw-${post.postid}`;
                        videoWrapper.dataset.originalContainerId = mediaContainerId;

                        mediaContainer.appendChild(videoWrapper);
                    },

                    text: () => {
                        fallbackText(mediaContainer, post.text || "");
                    }
                };

                const renderFn = renderers[post.type] || renderers.text;
                await renderFn();

                postElement.appendChild(mediaContainer);

                // ---------- META ----------
                const metaContainer = createElement("div", {
                    class: "post-media-meta"
                });

                if (post.title) {
                    metaContainer.appendChild(
                        createElement("h3", { class: "post-title" }, [post.title])
                    );
                }

                if (Array.isArray(post.tags) && post.tags.length > 0) {
                    const tagsContainer = createElement(
                        "div",
                        { class: "tags" },
                        post.tags.filter(Boolean).map(tag =>
                            createElement("a", {
                                href: `/hashtag/${encodeURIComponent(tag)}`,
                                class: "tag-link"
                            }, [
                                createElement("span", { class: "tag" }, [tag])
                            ])
                        )
                    );
                    metaContainer.appendChild(tagsContainer);
                }

                if (post.description) {
                    metaContainer.appendChild(createDescription(post.description));
                }

                postElement.appendChild(metaContainer);

                // ---------- HEADER + ACTIONS ----------
                const headerActionsRow = createElement("div", {
                    class: "hvflex-sb post-header-actions"
                });

                let header;
                try {
                    header = createPostHeader(post);
                } catch (headerErr) {
                    console.error(`Failed to construct header for post ${post.postid}:`, headerErr);
                    header = createElement("div", { class: "post-header-fallback" });
                }

                const metadata = normalizeMetadata(
                    metadataMap[post.postid],
                    post.postid
                );

                let actions;
                try {
                    actions = await createActions(metadata, isCreator, postElement);
                } catch (err) {
                    console.error(`createActions failed for post ${post.postid}:`, err);
                    actions = createElement("div", { class: "post-actions-error" });
                }

                headerActionsRow.appendChild(header);
                headerActionsRow.appendChild(actions);
                postElement.appendChild(headerActionsRow);

                postsContainer.appendChild(postElement);
            } catch (postErr) {
                console.error("Critical error while rendering single post item:", post, postErr);
            }
        }
    } catch (err) {
        console.error("renderPost pipeline execution failed:", err);
    }
}

/* ----------------- HELPERS ----------------- */

function normalizeMedia(post) {
    if (!post) return [];
    const media = post.media ?? post.media_url ?? [];
    if (Array.isArray(media)) {
        return media.filter(Boolean);
    }
    return media ? [media] : [];
}

function normalizeMetadata(metadata, postId) {
    return {
        postId,
        likes: typeof metadata?.likes === "number" ? metadata.likes : 0,
        comments: typeof metadata?.comments === "number" ? metadata.comments : 0,
        likedByUser: Boolean(metadata?.likedByUser)
    };
}

function safeDate(timestamp) {
    if (!timestamp) return "";
    try {
        return Datex(timestamp);
    } catch (err) {
        console.warn("safeDate conversion failed for timestamp:", timestamp, err);
        return "";
    }
}

function fallbackText(container, text) {
    if (!container) return;
    container.appendChild(createElement("p", {}, [text || ""]));
}

function createDescription(fullText) {
    if (typeof fullText !== "string") {
        fullText = String(fullText || "");
    }

    const maxLength = 180;
    const isLong = fullText.length > maxLength;
    const shortText = isLong
        ? fullText.slice(0, maxLength) + "..."
        : fullText;

    const descText = createElement("p", { class: "desc-text" }, [shortText]);
    const wrapper = createElement("div", { class: "post-description" }, [descText]);

    if (!isLong) {
        return wrapper;
    }

    let expanded = false;

    const toggleBtn = createElement("button", {
        class: "desc-toggle",
        type: "button"
    }, ["Show more"]);

    toggleBtn.addEventListener("click", () => {
        expanded = !expanded;
        descText.textContent = expanded ? fullText : shortText;
        toggleBtn.textContent = expanded ? "Show less" : "Show more";
    });

    wrapper.appendChild(toggleBtn);
    return wrapper;
}