import { getState } from "../../state/state.js";
import { formatDate } from "./profileHelpers.js";
import { logout } from "../auth/authService.js";
import { reportEntity } from "../reporting/reporting.js";
import Button, { ButtonOptions } from "../../components/base/Button.js";

import { toggleAction } from "../beats/toggleFollows.js";
import { meChat } from "../mechat/plugnplay.js";

/* ============================================================
    TYPE DEFINITIONS
============================================================ */

export interface UserProfile {
    userid?: string | number;
    username?: string;
    name?: string;
    bio?: string;
    is_following?: boolean;
    last_login?: string | Date;
    is_verified?: boolean;
    wallet_balance?: number;
    followerscount?: number;
    followscount?: number;
    [key: string]: unknown;
}

export interface InfoItem {
    label: string;
    value: string | Node;
}

export interface StatItem {
    label: string;
    value: number | string;
}

/* ============================================================
    DOM HELPERS & COMPONENTS
============================================================ */

/**
 * Appends child nodes to a parent element safely.
 */
function appendChildren(parent: HTMLElement, ...children: (Node | null | undefined)[]): void {
    children.forEach(child => {
        if (child instanceof Node) {
            parent.appendChild(child);
        } else if (child !== null && child !== undefined) {
            console.error("Invalid child passed to appendChildren:", child);
        }
    });
}

/**
 * Creates the container element containing user profile details.
 */
function createProfileDetails(profile: UserProfile, isLoggedIn: boolean): HTMLDivElement {
    const profileDetails = document.createElement("div");
    profileDetails.className = "profile-details";

    const username = document.createElement("strong");
    username.className = "username";
    username.textContent = `@${profile.username}`;

    const name = document.createElement("p");
    name.className = "name";
    name.textContent = profile.name || "";

    const bio = document.createElement("p");
    bio.className = "bio";
    bio.textContent = profile.bio || "";

    const profileActions = createProfileActions(profile, isLoggedIn);
    const profileInfo = createProfileInfo(profile);

    appendChildren(profileDetails, profileActions, name, username, bio, profileInfo);
    return profileDetails;
}

/**
 * Handles toggling the follow state for a user entity.
 */
function FollowUser(followBtn: HTMLButtonElement, userId: string | number): void {
    toggleAction({
        entityId: userId,
        entityType: "user",
        button: followBtn,
        apiPath: "/subscribes/",
        labels: { on: "Unfollow", off: "Follow" },
        actionName: "followed"
    });
}

/**
 * Generates action buttons depending on whether the current user owns the profile or is viewing another profile.
 */
function createProfileActions(profile: UserProfile, isLoggedIn: boolean): HTMLDivElement {
    const profileActions = document.createElement("div");
    profileActions.className = "profile-actions";

    const currentUser = getState("user")?.userid;

    // Owner Actions (Logout, Edit Profile)
    if (profile.userid === currentUser) {
        const logoutOptions: ButtonOptions = {
            title: "Logout",
            id: "logout-btn",
            events: { click: async () => await logout() },
            classes: "dropdown-item logout-btn"
        };
        const logoutButton = Button(logoutOptions);
        profileActions.appendChild(logoutButton);

        const editOptions: ButtonOptions = {
            title: "Edit Profile",
            id: "edit-profile-btn",
            classes: "btn edit-btn",
            "data-action": "edit-profile"
        };
        const editButton = Button(editOptions);
        profileActions.appendChild(editButton);
    }

    // Profile Actions for other users (Follow, Message, Report)
    if (isLoggedIn && profile.userid !== undefined && profile.userid !== currentUser) {
        const followButton = Button({
            title: profile.is_following ? "Unfollow" : "Follow",
            id: "follow-btn",
            classes: "btn follow-button",
            styles: { backgroundColor: "green" },
            "data-action": "toggle-follow",
            "data-userid": String(profile.userid)
        });
        followButton.addEventListener("click", () => FollowUser(followButton, profile.userid as string | number));
        profileActions.appendChild(followButton);

        const sendMessageOptions: ButtonOptions = {
            title: "Send Message",
            id: "send-msg",
            events: {
                click: () => meChat(profile.userid as string | number, "user", currentUser)
            },
            classes: "buttonx"
        };
        const sendMessagebtn = Button(sendMessageOptions);
        profileActions.appendChild(sendMessagebtn);

        const reportOptions: ButtonOptions = {
            title: "Report",
            id: "report-btn",
            events: {
                click: () => reportEntity(String(profile.userid), "user")
            },
            classes: "report-btn"
        };
        const reportButton = Button(reportOptions);
        profileActions.appendChild(reportButton);
    }

    return profileActions;
}

/**
 * Renders key account status items (Last Login, Verification).
 */
function createProfileInfo(profile: UserProfile): HTMLDivElement {
    const profileInfo = document.createElement("div");
    profileInfo.className = "profile-info";

    const infoItems: InfoItem[] = [
        { label: "Last Login", value: formatDate(profile.last_login) || "Never logged in" },
        { label: "Verification Status", value: profile.is_verified ? "Verified" : "Not Verified" },
    ];

    infoItems.forEach(({ label, value }) => {
        const infoItem = document.createElement("div");
        infoItem.className = "info-item";

        const strongLabel = document.createElement("strong");
        strongLabel.textContent = `${label}:`;
        infoItem.appendChild(strongLabel);

        if (value instanceof Node) {
            infoItem.appendChild(document.createTextNode(" "));
            infoItem.appendChild(value);
        } else {
            infoItem.appendChild(document.createTextNode(` ${value}`));
        }

        profileInfo.appendChild(infoItem);
    });

    return profileInfo;
}

/**
 * Renders numerical user statistics (Balance, Followers, Following).
 */
function createStatistics(profile: UserProfile): HTMLDivElement {
    const statistics = document.createElement("div");
    statistics.className = "statistics";

    const stats: StatItem[] = [
        { label: "Rupees", value: profile.wallet_balance || 0 },
        { label: "Followers", value: profile.followerscount || 0 },
        { label: "Following", value: profile.followscount || 0 },
    ];

    stats.forEach(({ label, value }) => {
        const statItem = document.createElement("p");
        statItem.className = "hflex";

        const strong = document.createElement("strong");
        strong.textContent = String(value);

        const labelSpan = document.createTextNode(` ${label}`);

        statItem.appendChild(strong);
        statItem.appendChild(labelSpan);
        statistics.appendChild(statItem);
    });

    return statistics;
}

/* ============================================================
    FORMATTERS & HELPERS
============================================================ */

/**
 * Formats a date string into a Datex component instance or formatted string
 */
export function formatDateUtil(dateString?: string | Date | null): HTMLElement | string | null {
    if (!dateString) return null;
    try {
        return formatDate(dateString);
    } catch (error) {
        console.error("Error formatting date with Datex:", error);
        return new Date(dateString).toLocaleString();
    }
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(string: string = ""): string {
    if (!string) return "";
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/* ============================================================
    LOADING INDICATORS
============================================================ */

/**
 * Renders a loading message to a target container or default #content element
 */
export function showLoadingMessage(message: string, containerId: string = "content"): void {
    removeLoadingMessage();

    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container #${containerId} not found to show loading message.`);
        return;
    }

    const loadingMsg = document.createElement("p");
    loadingMsg.id = "loading-msg";
    loadingMsg.className = "loading-message";
    loadingMsg.textContent = message;

    container.appendChild(loadingMsg);
}

/**
 * Removes active loading message from the DOM
 */
export function removeLoadingMessage(): void {
    const loadingMsg = document.getElementById("loading-msg");
    if (loadingMsg) {
        loadingMsg.remove();
    }
}

/* ============================================================
    MEDIA PREVIEWS
============================================================ */

/**
 * Previews an image file selection on a target image element
 */
export function previewAvatar(event: Event, previewId: string = "profile-picture-preview"): void {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    const preview = document.getElementById(previewId) as HTMLImageElement | null;

    if (!preview) return;

    if (file) {
        // Revoke previous Object URL to prevent memory leaks if re-uploading
        if (preview.dataset.objectUrl) {
            URL.revokeObjectURL(preview.dataset.objectUrl);
        }

        const objectUrl = URL.createObjectURL(file);
        preview.src = objectUrl;
        preview.style.display = "block";
        preview.dataset.objectUrl = objectUrl;
    }
}

export {
    createProfileDetails,
    createProfileActions,
    createProfileInfo,
    createStatistics,
    appendChildren
};