import { createElement } from "../../components/createElement.ts";
import Notify from "../../components/ui/Notify.ts";
import { MusicAPI } from "./fetchers.ts";
import { initPlayer } from "./player.ts";
import { getContentContainer, showLoadingOverlay, hideLoadingOverlay } from "./uiHelpers.ts";
import { ensureToolbar, ensureBackButton } from "./toolbar.ts";
import { createPlaylistCard, createAlbumCard } from "./cards.ts";
import { renderSongsSection } from "./sections.ts";
import { renderCardGrid } from "./cardGrid.ts";

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

        renderCardGrid(
            "Your Playlists",
            playlists,
            content,
            pl => createPlaylistCard(pl, container, player, isLoggedIn)
        );

        renderCardGrid(
            "Albums",
            albums,
            content,
            a => createAlbumCard(a, container, player)
        );

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