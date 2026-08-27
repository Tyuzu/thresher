import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { MusicAPI } from "./fetchers.js";
import { Song, Player } from "./types.js";
import { setButtonTextSafely } from "./uiHelpers.js";

export function createAddToPlaylistBtn(
    song: Song, 
    player: Player, 
    container: HTMLElement, 
    isLoggedIn: boolean
): HTMLElement {
    const btn = createElement("button", { class: "add-to-playlist-btn" }, ["➕ Add to Playlist"]);
    btn.addEventListener("click", async () => {
        if (!isLoggedIn) {
            Notify("You must be logged in to add songs to playlists", { type: "info" });
            return;
        }

        try {
            const playlists = await MusicAPI.playlists();
            if (!playlists.length) {
                Notify("No playlists available", { type: "info" });
                return;
            }

            const choice = prompt(`Select playlist by number:\n${playlists.map((pl, idx) => `${idx + 1}. ${pl.name}`).join("\n")}`);
            if (!choice) return;
            
            const index = parseInt(choice, 10) - 1;
            if (isNaN(index) || !playlists[index]) {
                Notify("Invalid selection", { type: "error" });
                return;
            }

            const playlistID = playlists[index].playlistID || playlists[index].playlistid;

            const res = await MusicAPI.addSongToPlaylist(playlistID, { songid: song.songid });
            if (res?.success) {
                Notify(`Added "${song.title}" to playlist "${playlists[index].name}"`);
            } else if (res?.error && (String(res.error).toLowerCase().includes("unauthorized") || String(res.error).toLowerCase().includes("401") || String(res.error).toLowerCase().includes("403"))) {
                Notify("You are not authorized. Please log in.", { type: "info" });
            } else {
                Notify(`Failed to add song: ${res?.error || "unknown"}`, { type: "error" });
            }
        } catch (err) {
            console.error("[add-to-playlist] Error:", err);
            Notify("Network error while adding song to playlist", { type: "error" });
        }
    });
    return btn;
}

export function createPlayButton(song: Song, idx: number, player: Player | null = null): HTMLButtonElement {
    const btn = createElement("button", { class: "song-play-btn" }, ["▶"]) as HTMLButtonElement;
    if (!song.audioUrl) {
        btn.disabled = true; 
        return btn; 
    }
    if (player) {
        btn.addEventListener("click", () => player.play(song, idx));
        song._playBtn = btn;
    }
    return btn;
}

export function createLikeButton(song: Song, isLoggedIn: boolean): HTMLElement {
    const btn = createElement("button", { class: "like-btn" }, [
        song.liked ? "❤️" : "🤍"
    ]) as HTMLButtonElement;

    let pending = false;

    btn.addEventListener("click", async () => {
        if (!isLoggedIn) {
            Notify("Login required", { type: "info" });
            return;
        }

        if (pending) {
            return;
        }
        pending = true;
        btn.disabled = true;

        const previousState = song.liked;

        try {
            const res = previousState
                ? await MusicAPI.unlikeSong(song.songid)
                : await MusicAPI.likeSong(song.songid);

            if (res?.success) {
                const newState =
                    typeof res?.data?.liked === "boolean"
                        ? res.data.liked
                        : !previousState;

                song.liked = newState;
                setButtonTextSafely(btn, newState ? "❤️" : "🤍");
            } else {
                Notify(res?.error || "Failed to update like", { type: "error" });
            }

        } catch {
            Notify("Network error while updating liked songs", { type: "error" });
        } finally {
            pending = false;
            btn.disabled = false;
        }
    });

    return btn;
}

export function createSongRow(
    song: Song, 
    idx: number, 
    player: Player | null = null, 
    batchSelection: Set<string> | null = null, 
    container: HTMLElement | null = null, 
    isLoggedIn: boolean = false
): HTMLElement {
    song.poster = song.poster ? resolveImagePath(EntityType.SONG, PictureType.THUMB, song.poster) : "/placeholder.png";
    song.audioUrl = song.audioUrl ? resolveImagePath(EntityType.SONG, PictureType.AUDIO, song.audioUrl) : null;

    const playBtn = createPlayButton(song, idx, player);
    const poster = createElement("img", { src: song.poster, alt: song.title || "", class: "song-poster" });
    const title = createElement("div", { class: "song-title" }, [song.title || "Untitled"]);

    const duration = song.duration || "";
    const meta = createElement("div", { class: "song-meta" }, [ `${song.genre || ""} • ${duration}` ]);

    const rowChildren: HTMLElement[] = [playBtn, poster, title, meta];

    if (player && container) {
        const addBtn = createAddToPlaylistBtn(song, player, container, isLoggedIn);
        rowChildren.push(addBtn);
    }

    if (isLoggedIn) {
        const likeBtn = createLikeButton(song, isLoggedIn);
        rowChildren.push(likeBtn);
    }

    if (batchSelection) {
        const checkbox = createElement("input", { type: "checkbox" }) as HTMLInputElement;
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                batchSelection.add(song.songid);
            } else {
                batchSelection.delete(song.songid);
            }
        });
        rowChildren.unshift(checkbox);
    }

    const row = createElement("div", { class: "song-row", "data-songid": song.songid }, rowChildren);
    return row;
}