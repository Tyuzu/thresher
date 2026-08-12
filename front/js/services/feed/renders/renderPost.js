import { createPostHeader } from "./helpers.js";
import { createActions } from "./actions.js";
import { createElement } from "../../../components/createElement.js";
import { RenderImagePost } from "../renderImagePost.js";
import { RenderVideoPost } from "../renderVideoPost.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { getState } from "../../../state/state.js";
import { navigate } from "../../../routes/index.js";
import Datex from "../../../components/base/Datex.js";

// Keep active video player references to prevent memory leaks
let activeVideoPlayers = [];

/**
 * Cleans up initialized video player instances.
 */
export function cleanupRenderPost() {
    activeVideoPlayers.forEach(player => {
        if (player && typeof player.cleanup === "function") {
            player.cleanup();
        }
    });
    activeVideoPlayers = [];
}

/**
 * Renders feed post elements into a container.
 * 
 * @param {Object|Object[]} posts - Single post or array of posts.
 * @param {HTMLElement} postsContainer - Parent container to mount posts into.
 * @param {Record<string, any>} postmetadata - Metadata map keyed by post ID.
 * @param {boolean|number} isNew - Indicates whether to prepend (1/true) or append (0/false).
 */
export async function renderPost(posts, postsContainer, postmetadata = {}, isNew = false) {
    if (!postsContainer) return;

    // Cleanup video players from previous renders
    cleanupRenderPost();

    const postList = Array.isArray(posts) ? posts : [posts];
    const isLoggedIn = Boolean(getState("token"));
    const user = getState("user");

    // Use DocumentFragment to batch DOM inserts and avoid repeated layout reflows
    const fragment = document.createDocumentFragment();

    for (const post of postList) {
        const isCreator = isLoggedIn && user === post.userid;

        // --- POST CONTAINER (<article>) ---
        const postElement = createElement("article", {
            class: ["feed-item"],
            id: `post-${post.postid}`,
            "data-date": Datex(post.timestamp)
        }, [createPostHeader(post)]);

        // --- MEDIA CONTAINER (<section>) ---
        const mediaContainer = createElement("section", { 
            class: ["post-media"],
            "aria-label": "Post media" 
        });

        const mediaUrls = Array.isArray(post.media_url)
            ? post.media_url
            : post.media_url ? [post.media_url] : [];

        if (post.type === "image") {
            RenderImagePost(mediaContainer, mediaUrls);
        } else if (post.type === "video") {
            const media = (post.media || []).map(m => resolveImagePath(EntityType.FEED, PictureType.VIDEO, m));
            const posterPath = resolveImagePath(EntityType.FEED, PictureType.POSTER, `${post.thumbnail || mediaUrls[0] || ""}`);
            
            const players = await RenderVideoPost(
                mediaContainer, 
                media, 
                mediaUrls, 
                post.resolutions || [], 
                [], 
                posterPath
            );
            
            if (Array.isArray(players)) {
                activeVideoPlayers.push(...players);
            }
        } else if (post.text) {
            mediaContainer.appendChild(createElement("p", { class: ["post-text-body"] }, [post.text]));
        } else {
            mediaContainer.appendChild(createElement("p", { class: ["post-unknown-type"] }, ["Unknown post type."]));
        }

        postElement.appendChild(mediaContainer);

        // --- META CONTAINER (<header> / <section>) ---
        if (post.title || post.tags?.length) {
            const metaSection = createElement("section", { class: ["post-meta"] });

            if (post.title) {
                metaSection.appendChild(createElement("h3", { class: ["post-title"] }, [post.title]));
            }

            if (post.tags?.length) {
                const tagsList = createElement("ul", { class: ["tags-list"] },
                    post.tags.map(tag =>
                        createElement("li", { class: ["tag-item"] }, [
                            createElement("a", { 
                                href: `/hashtag/${tag}`,
                                class: ["tag-link"] 
                            }, [`#${tag}`])
                        ])
                    )
                );

                const tagsNav = createElement("nav", { 
                    class: ["tags"], 
                    "aria-label": "Post hashtags" 
                }, [tagsList]);

                metaSection.appendChild(tagsNav);
            }

            // Keyboard and click navigation handling for post details
            metaSection.addEventListener("click", (e) => {
                // Avoid capturing clicks directly made on hashtag links
                if (!e.target.closest("a")) {
                    navigate(`/feedpost/${post.postid}`);
                }
            });

            postElement.appendChild(metaSection);
        }

        // --- ACTIONS CONTAINER (<footer>) ---
        const meta = postmetadata[post.postid] || { likes: 0, comments: 0, likedByUser: false };
        const actionsContainer = await createActions(meta, isCreator, postElement);
        
        // Wrap actions inside semantic footer
        const footerElement = createElement("footer", { class: ["post-actions-wrapper"] }, [actionsContainer]);
        postElement.appendChild(footerElement);

        // Append to batch fragment
        if (isNew) {
            fragment.prepend(postElement);
        } else {
            fragment.appendChild(postElement);
        }
    }

    // Single DOM update for better performance
    if (isNew) {
        postsContainer.prepend(fragment);
    } else {
        postsContainer.appendChild(fragment);
    }
}