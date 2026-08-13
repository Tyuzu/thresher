import { getState } from "../../../state/state.js";
import { apiFetch } from "../../../api/api.js";
import { createElement } from "../../../components/createElement.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import Notify from "../../../components/ui/Notify.mjs";
import Imagex from "../../../components/base/Imagex.js";
import Datex from "../../../components/base/Datex.js";

/**
 * Helper to turn an SVG string into a Node
 * Optimized using standard DOMParser to prevent memory leaks from dangling templates.
 */
const parser = new DOMParser();
export const svgToNode = (svgString) => {
    if (!svgString) return null;
    const doc = parser.parseFromString(svgString.trim(), "image/svg+xml");
    return doc.documentElement;
};

/**
 * Create Post Header with CLS protection & full accessibility attributes
 */
export function createPostHeader(post) {
    const userPicUrl = resolveImagePath(EntityType.USER, PictureType.THUMB, `${post.userid}.jpg`);

    // Performance: Explicit width/height prevent Cumulative Layout Shift (CLS)
    const img = Imagex({
        loading: "lazy",
        decoding: "async",
        src: userPicUrl,
        alt: `${post.username || 'User'}'s profile picture`,
        width: "40",
        height: "40",
        class: "profile-thumb",
    });

    // Accessibility: Informative label for screen readers
    const userIconLink = createElement("a", {
        href: `/user/${post.username}`,
        class: "user-icon",
        "aria-label": `View ${post.username || 'user'}'s profile`
    }, [img]);

    // Format timestamp safely
    let formattedTime = "";
    if (post.timestamp) {
        formattedTime = Datex(post.timestamp);
    }

    const usernameDiv = createElement("div", { class: "username" }, [post.username || ""]);
    const timestampDiv = createElement("time", { 
        class: "timestamp",
        dateTime: post.timestamp ? new Date(post.timestamp).toISOString() : ""
    }, [formattedTime]);

    const userTimeDiv = createElement("div", { class: "user-time" }, [
        usernameDiv,
        timestampDiv
    ]);

    return createElement("header", { class: "post-header hflex" }, [
        userIconLink,
        userTimeDiv
    ]);
}

/**
 * Batch fetch: POST /likes/:entitytype/batch/users
 */
export async function fetchUserMetaLikesBatch(entityType, entityIds = []) {
    if (!Array.isArray(entityIds) || entityIds.length === 0) {
        return {};
    }

    try {
        const response = await apiFetch(`/likes/${entityType}/batch/users`, "POST", {
            entity_ids: entityIds
        });

        if (response?.data && typeof response.data === "object") {
            return response.data;
        }

        return {};
    } catch (err) {
        console.error("fetchUserMetaLikesBatch error:", err);
        return {};
    }
}

/**
 * Singleton stylesheet instance preventing duplicate <style> tag injection
 */
let timelineStyleSheet = null;

function ensureTimelineStyleSheet() {
    if (!timelineStyleSheet && typeof document !== "undefined") {
        timelineStyleSheet = document.createElement("style");
        timelineStyleSheet.id = "feed-timeline-styles";
        timelineStyleSheet.textContent = `.feed-item::after { background-image: var(--after-bg); }`;
        document.head.appendChild(timelineStyleSheet);
    }
}

/**
 * Update timeline styles efficiently without mutating style tags in loops
 */
export function updateTimelineStyles() {
    ensureTimelineStyleSheet();

    const feedItems = document.querySelectorAll(".feed-item");
    const len = feedItems.length;

    for (let i = 0; i < len; i++) {
        const item = feedItems[i];
        const profileImg = item.querySelector(".profile-thumb")?.src || "";
        if (profileImg) {
            item.style.setProperty("--after-bg", `url("${profileImg}")`);
        }
    }
}

/**
 * Delete a post with proper notification handling
 */
export async function deletePost(postId, postElement, posts) {
    if (!getState("token")) {
        Notify("Please log in to delete your post.", { type: "warning", duration: 3000, dismissible: true });
        return;
    }

    // Best Practice: Non-blocking confirmation check
    const confirmed = window.confirm("Are you sure you want to delete this post?");
    if (!confirmed) return;

    try {
        await apiFetch(`/feed/post/${postId}`, "DELETE");
        Notify("Post deleted successfully.", { type: "success", duration: 3000, dismissible: true });

        if (postElement?.parentNode) {
            postElement.parentNode.removeChild(postElement);
        }

        if (Array.isArray(posts) && posts.length > 0) {
            const index = posts.findIndex(p => p.postid === postId);
            if (index !== -1) {
                posts.splice(index, 1);
            }
        }
    } catch (err) {
        Notify(`Error deleting post: ${err.message}`, { type: "error", duration: 3000, dismissible: true });
    }
}