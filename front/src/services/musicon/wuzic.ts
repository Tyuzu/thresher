import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.js";
import { MusicAPI } from "./fetchers.js";
import { initPlayer } from "./player.js";
import { getContentContainer, showLoadingOverlay, hideLoadingOverlay } from "./uiHelpers.js";
import { ensureToolbar, ensureBackButton } from "./toolbar.js";
import { createPlaylistCard, createAlbumCard } from "./cards.js";
import { renderSongsSection } from "./sections.js";
import { renderCardGrid } from "./cardGrid.js";

let currentRenderToken = 0;

export async function displayMusic(rootContainer: HTMLElement, isLoggedIn: boolean): Promise<void> {
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