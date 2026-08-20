// cards.js

import { createElement } from "../../components/createElement.ts";
import Notify from "../../components/ui/Notify.ts";
import { MusicAPI } from "./fetchers.ts";
import { loadPlaylistSongs, loadAlbumSongs } from "./loaders.ts";

export function createPlaylistCard(playlist, container, player, isLoggedIn) {

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
        const delBtn = createElement("button", {}, ["Delete"]);
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

export function createAlbumCard(album, container, player) {
    const card = createElement("div", { class: "album-card" }, [
        createElement("p", {}, [album.title || "Untitled Album"])
    ]);

    card.addEventListener("click", () =>
        loadAlbumSongs(album.albumid, album.title, container, player)
    );

    return card;
}