import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.js";
import { getState } from "../../state/state.js";
import { createSongRow } from "./songUI.js";
import { Song, Player } from "./types.js";

export function renderSongsSection(
    title: string, 
    songs: Song[], 
    container: HTMLElement, 
    player: Player | null = null, 
    batchSelection: Set<string> | null = null, 
    loadMore: (() => Promise<Song[]>) | null = null
): void {
    const userState = getState("user") as { userid?: string };
    const isL = Boolean(userState?.userid);
    if (!songs?.length) {
        return;
    }
    const section = createElement("div", { class: "music-section" }, [createElement("h3", {}, [title])]);
    const list = createElement("div", { class: "songs-table" });

    const frag = document.createDocumentFragment();
    const allSongs = songs.slice();
    songs.forEach((song, idx) => frag.appendChild(createSongRow(song, idx, player, batchSelection, container, isL)));
    list.append(frag);
    section.append(list);

    if (typeof loadMore === "function") {
        const loadMoreBtn = createElement("button", {}, ["Load More"]) as HTMLButtonElement;
        let loading = false;
        loadMoreBtn.addEventListener("click", async () => {
            if (loading) {
                return;
            }
            loading = true;
            loadMoreBtn.disabled = true;
            const moreSongs = await loadMore();
            loading = false;
            loadMoreBtn.disabled = false;
            if (!moreSongs.length) {
                Notify("No more songs", { type: "info" });
                return;
            }
            const frag2 = document.createDocumentFragment();
            const startIndex = allSongs.length;
            moreSongs.forEach((s, i) => {
                frag2.appendChild(createSongRow(s, startIndex + i, player, batchSelection, container));
                allSongs.push(s);
            });
            list.append(frag2);
            if (player?.setQueue) {
                player.setQueue(allSongs);
            }
        });
        section.append(loadMoreBtn);
    }

    container.append(section);

    if (player?.setQueue) {
        player.setQueue(songs.slice());
    }
}