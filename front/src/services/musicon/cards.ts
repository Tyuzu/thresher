import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.js";
import { MusicAPI } from "./fetchers.js";
import { loadPlaylistSongs, loadAlbumSongs } from "./loaders.js";
import { Playlist, Album, Player } from "./types.js";

export function createPlaylistCard(
    playlist: Playlist, 
    container: HTMLElement, 
    player: Player, 
    isLoggedIn: boolean
): HTMLElement {
    const playlistID = playlist.playlistid;
    const isLikes = playlistID?.startsWith("likes_");

    const card = createElement("div", { class: "playlist-card" }, [
        createElement("p", {}, [playlist.name || "Untitled Playlist"]),
        createElement("small", {}, [`${playlist.songs?.length || 0} songs`])
    ]);

    const viewBtn = createElement("button", {}, ["View"]);
    viewBtn.addEventListener("click", () =>
        loadPlaylistSongs(playlistID, container, player)
    );

    card.append(viewBtn);

    if (!isLikes && isLoggedIn) {
        const delBtn = createElement("button", {}, ["Delete"]) as HTMLButtonElement;
        delBtn.addEventListener("click", async () => {
            delBtn.disabled = true;
            const res = await MusicAPI.removePlaylist(playlistID);
            if (res?.success) {
                MusicAPI.invalidate();
                container.parentElement?.replaceChildren();
            } else {
                Notify("Failed to delete playlist", { type: "error" });
            }
            delBtn.disabled = false;
        });
        card.append(delBtn);
    }

    return card;
}

export function createAlbumCard(
    album: Album, 
    container: HTMLElement, 
    player: Player
): HTMLElement {
    const card = createElement("div", { class: "album-card" }, [
        createElement("p", {}, [album.title || "Untitled Album"])
    ]);

    card.addEventListener("click", () =>
        loadAlbumSongs(album.albumid, album.title || "Untitled Album", container, player)
    );

    return card;
}