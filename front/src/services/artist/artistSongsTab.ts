// songsTab.ts (refactored for immutable song objects)
import { getArtistSongs, deleteArtistSong } from "./api.js";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { initPlayer, setSongQueue, resetPlayer, createPlayerFooter } from "./player.js";
import Notify from "../../components/ui/Notify.js";
import { openSongModal } from "./songModal.js";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface Song {
    songid?: string | number;
    title?: string;
    genre?: string;
    duration?: string;
    description?: string;
    poster?: string;
    audioUrl?: string;
    published?: boolean;
    [key: string]: any;
}

export interface PlayerInstance {
    container: HTMLElement;
    play: (song: Song, idx: number, btn: HTMLButtonElement) => void;
    [key: string]: any;
}

// ------------------------ Helpers ------------------------
async function fetchSongs(artistID: string | number): Promise<Song[]> {
    try {
        return (await getArtistSongs(artistID)) as Song[];
    } catch (err) {
        console.error("Error fetching songs:", err);
        return [];
    }
}

function createUploadButton(artistID: string | number, container: HTMLElement): HTMLElement {
    return Button("Upload New Song", "button", {
        click: () => openSongModal({ mode: "upload", artistID, container })
    }, "open-upload-modal") as HTMLElement;
}

function createSongInfo(song: Song): HTMLElement {
    const info = createElement("div", { class: "song-info" }) as HTMLElement;
    const title = createElement("div", { class: "song-title" }, [song.title || "Untitled"]);
    const metaText = [song.genre, song.duration].filter(Boolean).join(" • ");
    const meta = createElement("div", { class: "song-meta" }, [metaText]);
    info.append(title, meta);
    
    if (song.description) {
        info.append(createElement("div", { class: "song-desc" }, [song.description]));
    }
    
    return info;
}

function createSongActions(song: Song, artistID: string | number, container: HTMLElement, isCreator: boolean): HTMLElement | null {
    if (!isCreator) {
        return null;
    }

    const actions = createElement("div", { class: "song-actions" }) as HTMLElement;

    const editBtn = Button("Edit", "button", {
        click: () => openSongModal({ mode: "edit", song, artistID, container, isCreator })
    }) as HTMLElement;

    const delBtn = Button("Delete", "button", {
        click: async () => {
            if (!confirm(`Delete "${song.title}"?`)) {
                return;
            }
                if (song.songid !== undefined && song.songid !== null) {
                await deleteArtistSong(artistID, song.songid);
            }
            delBtn.closest(".song-row")?.remove();
            Notify("Song deleted");
        }
    }) as HTMLElement;

    actions.append(editBtn, delBtn);
    return actions;
}

function createPlayButton(song: Song, idx: number, player: PlayerInstance): HTMLButtonElement {
    const btn = createElement("button", { class: "song-play-btn" }, ["▶"]) as HTMLButtonElement;

    if (!song.audioUrl) {
        btn.disabled = true;
        return btn;
    }

    btn.addEventListener("click", () => {
        player.play(song, idx, btn);
    });

    return btn;
}

// ------------------------ Song Row ------------------------
function createSongRow(song: Song, idx: number, artistID: string | number, player: PlayerInstance, isCreator: boolean): HTMLElement {
    const poster = resolveImagePath(EntityType.SONG, PictureType.THUMB, song.poster || "") || "/placeholder.png";
    const audioUrl = resolveImagePath(EntityType.SONG, PictureType.AUDIO, song.audioUrl || "") || undefined;

    const rowChildren = [
        createPlayButton({ ...song, audioUrl, poster }, idx, player),
        Imagex({ src: poster, alt: song.title || "", classes: "song-poster" }),
        createSongInfo(song)
    ];

    const actions = createSongActions(song, artistID, player.container, isCreator);
    if (actions) {
        rowChildren.push(actions);
    }

    return createElement("div", { class: "song-row" }, rowChildren) as HTMLElement;
}

// ------------------------ Song List ------------------------
function createSongsList(songs: Song[], artistID: string | number, player: PlayerInstance, isCreator: boolean): HTMLElement {
    const list = createElement("div", { class: "songs-table" }) as HTMLElement;
    const queue: Song[] = [];

    songs.forEach((song, idx) => {
        if (!song.published && !isCreator) {
            return;
        }
        const row = createSongRow(song, idx, artistID, player, isCreator);
        list.append(row);
        queue.push(song);
    });

    setSongQueue(queue);
    createPlayerFooter(player.container);
    return list;
}

// ------------------------ Main Renderer ------------------------
async function renderSongsTab(container: HTMLElement, artistID: string | number, isCreator: boolean): Promise<void> {
    resetPlayer();
    const player = initPlayer(container) as unknown as PlayerInstance; // handles internal play button state
    const songs = await fetchSongs(artistID);

    container.replaceChildren();

    if (isCreator) {
        container.append(createUploadButton(artistID, container));
    }

    if (!songs.length) {
        container.append(createElement("p", {}, ["No songs available."]));
        return;
    }

    container.append(createSongsList(songs, artistID, player, isCreator));
}

export { renderSongsTab };