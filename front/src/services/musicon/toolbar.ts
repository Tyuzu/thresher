import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.js";
import { MusicAPI } from "./fetchers.js";
import { createPlaylistCard } from "./cards.js";
import { renderSongsSection } from "./sections.js";
import { getContentContainer, showLoadingOverlay, hideLoadingOverlay } from "./uiHelpers.js";
import { renderCardGrid } from "./cardGrid.js";
import { Player } from "./types.js";

export function ensureToolbar(container: HTMLElement, player: Player, isLoggedIn: boolean): HTMLElement {
    let toolbar = container.querySelector(".music-toolbar") as HTMLElement;
    if (toolbar) {
        return toolbar;
    }

    toolbar = createElement("div", { class: "music-toolbar" });
    container.prepend(toolbar);

    const content = getContentContainer(container);

    const viewPlaylistsBtn = createElement("button", {}, ["View Playlists"]);
    viewPlaylistsBtn.addEventListener("click", async () => {
        showLoadingOverlay(content, "Loading playlists...");
        const playlists = isLoggedIn ? await MusicAPI.playlists(true) : [];
        hideLoadingOverlay(content);
        
        content.replaceChildren();
        renderCardGrid(
            "Playlists",
            playlists,
            content,
            pl => createPlaylistCard(pl, container, player, isLoggedIn),
            "No playlists found."
        );
    });

    const createPlaylistBtn = createElement("button", {}, ["Create Playlist"]) as HTMLButtonElement;
    createPlaylistBtn.addEventListener("click", async () => {
        if (!isLoggedIn) {
            Notify("Login required", { type: "info" });
            return;
        }

        const name = prompt("Enter playlist name:");
        if (!name) {
            return;
        }

        createPlaylistBtn.disabled = true;
        try {
            const res = await MusicAPI.createPlaylist({ name });
            if (res?.success) {
                MusicAPI.invalidate();
                Notify("Playlist created successfully", { type: "success" });
                viewPlaylistsBtn.click();
            } else {
                Notify("Failed to create playlist", { type: "error" });
            }
        } finally {
            createPlaylistBtn.disabled = false;
        }
    });

    const likesBtn = createElement("button", {}, ["Liked Songs"]);
    likesBtn.addEventListener("click", async () => {
        if (!isLoggedIn) {
            Notify("Login required", { type: "info" });
            return;
        }

        showLoadingOverlay(content, "Loading liked songs...");
        const likedSongs = await MusicAPI.likedSongs();
        hideLoadingOverlay(content);

        content.replaceChildren();

        if (!likedSongs.length) {
            content.append(createElement("p", {}, ["No liked songs."]));
        } else {
            renderSongsSection("Liked Songs", likedSongs, content, player);
        }
    });

    toolbar.append(viewPlaylistsBtn, createPlaylistBtn, likesBtn);
    return toolbar;
}

export function ensureBackButton(container: HTMLElement, onClick: () => void): void {
    if (container.querySelector(".back-btn")) {
        return;
    }

    const backBtn = createElement("button", { class: "back-btn" }, ["⬅ Back"]);
    backBtn.addEventListener("click", onClick);
    container.prepend(backBtn);
}