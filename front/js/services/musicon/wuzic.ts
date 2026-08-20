// wuzic.js

import { createElement } from "../../components/createElement.ts";
import Notify from "../../components/ui/Notify.ts";
import { MusicAPI } from "./fetchers.ts";
import { initPlayer } from "./player.ts";
import { getContentContainer, showLoadingOverlay, hideLoadingOverlay } from "./uiHelpers.ts";
import { ensureToolbar, ensureBackButton } from "./toolbar.ts";
import { createPlaylistCard, createAlbumCard } from "./cards.ts";
import { renderSongsSection } from "./sections.ts";

let currentRenderToken = 0;

export async function displayMusic(rootContainer, isLoggedIn) {
    if (!rootContainer) {
return;
}

    rootContainer.replaceChildren();

    const container = createElement("div", { class: "musicon" });
    rootContainer.appendChild(container);

    const player = initPlayer(container);

    ensureToolbar(container, player, isLoggedIn);
    ensureBackButton(container, () => displayMusic(rootContainer, isLoggedIn));

    const content = getContentContainer(container);

    const renderToken = ++currentRenderToken;

    showLoadingOverlay(content, "Loading music...");

    try {
        const artistID = "zJbQfaZ7pyoq";

        const [
            playlists,
            albums,
            recommended,
            _recommendedAlbums,
            artistSongs,
            personalized
        ] = await Promise.all([
            isLoggedIn ? MusicAPI.playlists() : [],
            MusicAPI.albums(),
            MusicAPI.recommendedSongs(),
            MusicAPI.recommendedAlbums(),
            MusicAPI.artistSongs(artistID),
            isLoggedIn ? MusicAPI.personalizedRecommendations() : []
        ]);

        if (renderToken !== currentRenderToken) {
return;
}

        content.replaceChildren();

        if (artistSongs.length) {
renderSongsSection("Artist Songs", artistSongs, content, player);
}

        if (personalized.length) {
renderSongsSection("Because You Listened", personalized, content, player);
}

        if (recommended.length) {
renderSongsSection("Recommended for You", recommended, content, player);
}

        if (playlists.length) {
            const section = createElement("div", { class: "music-section" }, [
                createElement("h3", {}, ["Your Playlists"])
            ]);
            const frag = document.createDocumentFragment();
            playlists.forEach(pl => frag.append(createPlaylistCard(pl, container, player, isLoggedIn)));
            section.append(frag);
            content.append(section);
        }

        if (albums.length) {
            const section = createElement("div", { class: "music-section" }, [
                createElement("h3", {}, ["Albums"])
            ]);
            const frag = document.createDocumentFragment();
            albums.forEach(a => frag.append(createAlbumCard(a, container, player)));
            section.append(frag);
            content.append(section);
        }

        if (!content.children.length) {
            content.append(createElement("p", {}, ["No music available."]));
        }

    } catch {
        content.replaceChildren(createElement("p", {}, ["Error loading music."]));
        Notify("Failed to load music", { type: "error" });
    } finally {
        hideLoadingOverlay(content);
    }
}