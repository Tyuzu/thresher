import "../../../css/subpages/comments.css";
import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import { getComments, createComment } from "./api.js";
import { fetchUserMeta } from "../../utils/usersMeta.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { navigate } from "../../routes/navigate.js";
import { debounce } from "../../utils/deutils.js";
import Datex from "../../components/base/Datex.js";
import { reportEntity } from "../reporting/reporting.js";

/* =========================
   TYPES & INTERFACES
========================= */

export type SortOption = "newest" | "oldest";

export interface UserMeta {
    username?: string;
    [key: string]: unknown;
}

export interface CommentItem {
    commentid: string | number;
    createdBy: string | number;
    createdAt?: string | number | Date;
    content?: string;
    user?: UserMeta;
    [key: string]: unknown;
}

interface CommentState {
    entityType: string;
    entityId: string | number;
    currentUser: unknown;
    list: HTMLDivElement;
    input: HTMLTextAreaElement;
    sort: SortOption;
    page: number;
    hasMore: boolean;
    loading: boolean;
}

/* =========================
   CONFIG
========================= */

const PAGE_SIZE = 10;

/* =========================
   STATE
========================= */

const commentState = new Map<string, CommentState>();
const userCache = new Map<string | number, UserMeta>();

/* =========================
   HELPERS
========================= */

function makeKey(entityType: string, entityId: string | number): string {
    return JSON.stringify([entityType, entityId]);
}

function mapSort(val: SortOption): "old" | "new" {
    return val === "oldest" ? "old" : "new";
}

async function getUsersMeta(ids: (string | number)[]): Promise<Record<string | number, UserMeta>> {
    const missing = ids.filter(id => !userCache.has(id));
    if (missing.length) {
        try {
            // Convert array of string | number to string[]
            const data: Record<string | number, UserMeta> = await fetchUserMeta(missing.map(String));
            Object.entries(data).forEach(([id, u]) => userCache.set(id, u));
        } catch (e) {
            console.error("User meta fetch failed", e);
        }
    }

    return Object.fromEntries(ids.map(id => [id, userCache.get(id) || {}]));
}

async function fetchComments(
    entityType: string,
    entityId: string | number,
    page: number,
    sort: SortOption
): Promise<CommentItem[]> {
    console.warn("entityType: ", entityType);
    console.warn("entityId: ", entityId);
    console.warn("page: ", page);
    console.warn("sort: ", sort);
    try {
        const res = await getComments(entityType, entityId, mapSort(sort), page);
        return Array.isArray(res) ? (res as CommentItem[]) : [];
    } catch (err) {
        console.error("Failed to fetch comments", err);
        return [];
    }
}

function showError(container: HTMLElement, msg: string): void {
    container.appendChild(
        createElement("p", { class: "comment-error" }, [msg])
    );
}

/* =========================
   RENDER
========================= */

function renderComment(comment: CommentItem, entityType: string, entityId: string | number): HTMLDivElement {
    const user = comment.user || {};

    const avatarLeft = Imagex({
        src: resolveImagePath(EntityType.USER, PictureType.THUMB, String(comment.createdBy)),
        alt: `${user.username || "Unknown"} avatar`,
        classes: "comment-avatar"
    }) as HTMLElement;

    avatarLeft.addEventListener("click", () => {
        if (user.username) {
            navigate(`/user/${user.username}`);
        }
    });

    const usernameEl = createElement("span", {
        class: "comment-username",
        style: { cursor: "pointer" }
    }, [user.username || "Unknown"]);

    usernameEl.addEventListener("click", () => {
        if (user.username) {
            navigate(`/user/${user.username}`);
        }
    });

    const header = createElement("div", { class: "comment-header" }, [
        usernameEl,
        createElement("span", { class: "comment-timestamp" }, [
            comment.createdAt ? Datex(comment.createdAt) : ""
        ])
    ]);

    const body = createElement("div", { class: "comment-body" }, [
        createElement("p", {}, [comment.content || ""])
    ]);

    const actions = createElement("div", { class: "comment-actions" }, [
        Button({
            title: "Reply",
            classes: "comment-reply buttonx",
            events: {
                click: () => console.warn("Reply:", comment.commentid)
            }
        }),
        Button({
            title: "Report",
            classes: "comment-report buttonx",
            events: {
                // Ensure both commentid and entityId are converted to strings
                click: () => reportEntity(String(comment.commentid), "comment", entityType, String(entityId))
            }
        })
    ]);

    return createElement("div", { class: "comment" }, [
        createElement("div", { class: "comment-left" }, [avatarLeft]),
        createElement("div", { class: "comment-right" }, [header, body, actions])
    ]);
}

async function appendComments(state: CommentState, comments: CommentItem[], toTop = false): Promise<void> {
    const ids = [...new Set(comments.map(c => c.createdBy))];
    const usersMeta = await getUsersMeta(ids);

    const fragment = document.createDocumentFragment();

    comments.forEach(c => {
        const user = usersMeta[c.createdBy] || {};
        const node = renderComment({ ...c, user }, state.entityType, state.entityId);
        fragment.appendChild(node);
    });

    if (toTop) {
        state.list.prepend(fragment);
    } else {
        state.list.appendChild(fragment);
    }
}

/* =========================
   LOAD
========================= */

async function loadComments(key: string, reset = false): Promise<void> {
    const state = commentState.get(key);
    if (!state || state.loading) {
        return;
    }

    state.loading = true;

    try {
        if (reset) {
            state.page = 1;
            state.hasMore = true;
            state.list.replaceChildren();
        }

        const data = await fetchComments(
            state.entityType,
            state.entityId,
            state.page,
            state.sort
        );

        state.hasMore = data.length === PAGE_SIZE;

        if (!data.length && reset) {
            showError(state.list, "No comments yet.");
            return;
        }

        await appendComments(state, data);

    } catch {
        showError(state.list, "Failed to load comments.");
    } finally {
        state.loading = false;
    }
}

/* =========================
   PAGINATION
========================= */

async function fetchMoreComments(key: string): Promise<void> {
    const state = commentState.get(key);
    if (!state || !state.hasMore || state.loading) {
        return;
    }

    state.loading = true;

    try {
        state.page += 1;

        const data = await fetchComments(
            state.entityType,
            state.entityId,
            state.page,
            state.sort
        );

        if (!data.length) {
            state.hasMore = false;
            return;
        }

        state.hasMore = data.length === PAGE_SIZE;

        await appendComments(state, data);

    } catch {
        showError(state.list, "Failed to load more comments.");
    } finally {
        state.loading = false;
    }
}

/* =========================
   SUBMIT
========================= */

async function handleSubmit(e: SubmitEvent | Event, key: string): Promise<void> {
    e.preventDefault();

    const state = commentState.get(key);
    if (!state || !state.currentUser) {
        return;
    }

    const content = state.input.value.trim();
    if (!content) {
        return;
    }

    try {
        const newComment = await createComment(state.entityType, state.entityId, content) as CommentItem;

        const usersMeta = await getUsersMeta([newComment.createdBy]);
        const user = usersMeta[newComment.createdBy] || {};

        state.input.value = "";

        await appendComments(state, [{ ...newComment, user }], true);

    } catch {
        showError(state.list, "Failed to post comment.");
    }
}

/* =========================
   PUBLIC API
========================= */

export function createCommentsSection(
    entityType: string,
    entityId: string | number,
    currentUser: unknown
): HTMLDivElement {
    const key = makeKey(entityType, entityId);

    const container = createElement("div", {
        class: "comments-section"
    });

    const list = createElement("div", { class: "comments-list" });

    const sort = createElement("select", { class: "comment-sort" }, [
        createElement("option", { value: "newest" }, ["Newest"]),
        createElement("option", { value: "oldest" }, ["Oldest"])
    ]);

    const loadMoreBtn = Button({
        title: "Load More",
        classes: "load-more-comments buttonx",
        events: {
            click: () => fetchMoreComments(key)
        }
    });

    const input = createElement("textarea", {
        class: "comment-input",
        placeholder: currentUser ? "Write a comment..." : "Login to comment",
        disabled: !currentUser
    });

    const form = createElement("form", { class: "comment-form" }, [
        input,
        createElement("button", {
            type: "submit",
            disabled: !currentUser
        }, ["Post"])
    ]);

    container.append(sort, form, list, loadMoreBtn);

    const state: CommentState = {
        entityType,
        entityId,
        currentUser,
        list,
        input,
        sort: "newest",
        page: 1,
        hasMore: true,
        loading: false
    };

    commentState.set(key, state);

    loadComments(key, true);

    form.addEventListener("submit", e => handleSubmit(e, key));

    sort.addEventListener(
        "change",
        debounce((e: Event) => {
            const target = e.target as HTMLSelectElement;
            const s = commentState.get(key);
            if (!s) {
                return;
            }
            s.sort = target.value as SortOption;
            loadComments(key, true);
        }, 250)
    );

    return container;
}

/* =========================
   CLEANUP
========================= */

export function destroyCommentsSection(entityType: string, entityId: string | number): void {
    const key = makeKey(entityType, entityId);
    commentState.delete(key);
}