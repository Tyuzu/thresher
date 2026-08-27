import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js"; // Import your custom Button component
import Notify from "../../components/ui/Notify.js";
import { MusicAPI } from "./fetchers.js";
import { getContentContainer, showLoadingOverlay, hideLoadingOverlay } from "./uiHelpers.js";
import { renderSongsSection } from "./sections.js";
import { Song, Player } from "./types.js";

interface LoadSongsOptions {
    loadingText?: string;
    noSongsText?: string;
    title?: string;
    enableBatchSelection?: boolean;
    enableSearch?: boolean;
    reloadCallback?: (() => void) | null;
}

async function loadSongs(
    fetchFunction: (...args: any[]) => Promise<Song[]>, 
    fetchParams: any[], 
    container: HTMLElement, 
    player: Player, 
    options: LoadSongsOptions = {}
): Promise<void> {
    const {
        loadingText = "Loading...",
        noSongsText = "No songs found.",
        title = "Songs",
        enableBatchSelection = false,
        enableSearch = false,
        reloadCallback = null
    } = options;

    const content = getContentContainer(container);
    showLoadingOverlay(content, loadingText);
    const songs = await fetchFunction(...fetchParams);
    hideLoadingOverlay(content);

    content.replaceChildren();

    if (!songs.length) {
        content.append(createElement("p", {}, [noSongsText]));
        return;
    }

    let batchSelection: Set<string> | null = null;
    if (enableBatchSelection) {
        batchSelection = new Set<string>();
        const batchActions = createElement("div", { class: "batch-actions" });
        
        // Using the enhanced Button component for "Add to Queue"
        const addBtn = Button({
            title: "Add to Queue",
            classes: "btn-add-queue",
            events: {
                click: () => {
                    const selected = songs.filter(s => batchSelection?.has(s.songid));
                    if (!selected.length) {
                        Notify("No songs selected", { type: "info" });
                        return;
                    }
                    player?.setQueue?.(selected);
                    Notify(`${selected.length} songs added to queue`);
                    return;
                }
            }
        });

        // Using the enhanced Button component for "Remove from Playlist"
        const removeBtn = Button({
            title: "Remove from Playlist",
            classes: "btn-remove-playlist",
            events: {
                click: async () => {
                    const selected = Array.from(batchSelection!);
                    if (!selected.length) {
                        Notify("No songs selected", { type: "info" });
                        return;
                    }
                    try {
                        await Promise.all(selected.map(id => MusicAPI.removeSongFromPlaylist(fetchParams[0], id)));
                        Notify(`${selected.length} songs removed`);
                        if (reloadCallback) {
                            reloadCallback();
                        }
                    } catch (err) {
                        console.error("[remove] Error:", err);
                        Notify("Failed to remove songs", { type: "error" });
                    }
                    return;
                }
            }
        });

        batchActions.append(addBtn, removeBtn);
        content.append(batchActions);
    }

    const loadMoreFunction = async (): Promise<Song[]> => {
        const offset = songs.length;
        return await fetchFunction(...fetchParams, offset);
    };

    renderSongsSection(title, songs, content, player, batchSelection, loadMoreFunction);

    if (enableSearch) {
        const searchInput = createElement("input", { placeholder: "Search songs...", style: "margin:5px 0;", class: "sort-box" }) as HTMLInputElement;
        searchInput.addEventListener("input", () => {
            const query = searchInput.value.toLowerCase();
            content.querySelectorAll(".song-row").forEach(row => {
                const titleEl = row.querySelector(".song-title");
                const songTitle = titleEl ? (titleEl.firstChild?.textContent || "") : "";
                (row as HTMLElement).style.display = songTitle.toLowerCase().includes(query) ? "" : "none";
            });
        });
        content.prepend(searchInput);
    }
}

export async function loadPlaylistSongs(playlistID: string, container: HTMLElement, player: Player): Promise<void> {
    await loadSongs(
        MusicAPI.playlistSongs,
        [playlistID],
        container,
        player,
        {
            loadingText: "Loading playlist...",
            noSongsText: "No songs in this playlist.",
            title: "Playlist Songs",
            enableBatchSelection: true,
            enableSearch: true,
            reloadCallback: () => loadPlaylistSongs(playlistID, container, player)
        }
    );
}

export async function loadAlbumSongs(albumID: string, albumTitle: string, container: HTMLElement, player: Player): Promise<void> {
    await loadSongs(
        MusicAPI.albumSongs,
        [albumID],
        container,
        player,
        {
            loadingText: "Loading album...",
            noSongsText: "No songs in this album.",
            title: albumTitle,
            enableBatchSelection: false,
            enableSearch: false
        }
    );
}