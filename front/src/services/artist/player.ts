// player.ts
import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import { playSVG, pauseSVG } from "../../components/svgs/featherSVGs";

// ------------------------ Interfaces & Types ------------------------

export interface Song {
    songid?: string | number;
    title?: string;
    audioUrl?: string;
    audioextn?: string;
    _playBtn?: HTMLElement | null;
    [key: string]: any;
}

interface PlayerState {
    container: HTMLElement | null;
    audio: HTMLAudioElement | null;
    currentPlayBtn: HTMLElement | null;
    currentIndex: number;
    songQueue: Song[];
    isShuffle: boolean;
    isAutoplay: boolean;
}

export interface PlayerController {
    play: (song: Song, idx: number) => void;
    playNext: () => void;
    setQueue: (songs: Song[]) => void;
    reset: () => void;
}

// ------------------------ Player State ------------------------
const state: PlayerState = {
    container: null,
    audio: null,
    currentPlayBtn: null,
    currentIndex: -1,
    songQueue: [],
    isShuffle: false,
    isAutoplay: true
};

// ------------------------ DOM Helpers ------------------------
function updatePlayButtonIcon(btn: HTMLElement | null, isPlaying: boolean): void {
    if (!btn) {
        return;
    }
    btn.replaceChildren(isPlaying ? pauseSVG : playSVG);
}

// ------------------------ Footer Creation ------------------------
export function createPlayerFooter(container: HTMLElement): void {
    if (state.audio) {
        return;
    } // Already initialized

    const footer = createElement("footer", { class: "songs-footer" }) as HTMLElement;
    const audio = createElement("audio", { id: "songs-audio", controls: true }) as HTMLAudioElement;
    state.audio = audio;

    const shuffleBtn = Button("Shuffle", "button", {
        click: () => {
            state.isShuffle = !state.isShuffle;
            shuffleBtn.classList.toggle("active", state.isShuffle);
        }
    }, "shuffle-btn") as HTMLElement;

    const autoplayBtn = Button("Autoplay", "button", {
        click: () => {
            state.isAutoplay = !state.isAutoplay;
            autoplayBtn.classList.toggle("active", state.isAutoplay);
        }
    }, "autoplay-btn") as HTMLElement;

    footer.append(shuffleBtn, autoplayBtn, audio);
    container.append(footer);

    audio.addEventListener("ended", () => {
        if (state.isAutoplay) {
            playNextSong();
        }
    });
}

// ------------------------ Playback Logic ------------------------
function playSong(song: Song): void {
    if (!state.audio || !song.audioUrl) {
        return;
    }

    // Pause if same song already playing
    if (state.audio.src.endsWith(`${song.audioextn ?? ""}`) && !state.audio.paused) {
        state.audio.pause();
        updatePlayButtonIcon(state.currentPlayBtn, false);
        return;
    }

    // Reset previous button
    updatePlayButtonIcon(state.currentPlayBtn, false);

    // Load new song
    state.audio.src = `${song.audioUrl}${song.audioextn ?? ""}`;
    state.audio.play();

    state.currentPlayBtn = song._playBtn ?? null;
    updatePlayButtonIcon(state.currentPlayBtn, true);
}

function playNextSong(): void {
    const { songQueue } = state;
    if (!songQueue.length) {
        return;
    }

    state.currentIndex = state.isShuffle
        ? Math.floor(Math.random() * songQueue.length)
        : (state.currentIndex + 1) % songQueue.length;

    const nextSong = songQueue[state.currentIndex];
    if (nextSong) {
        playSong(nextSong);
    }
}

// ------------------------ State Control ------------------------
function setSongQueue(songs: Song[]): void {
    state.songQueue = songs || [];
    state.currentIndex = -1;
}

function setCurrentIndex(idx: number): void {
    state.currentIndex = idx;
}

function resetPlayer(): void {
    if (state.audio) {
        state.audio.pause();
    }
    state.container = null;
    state.audio = null;
    state.currentPlayBtn = null;
    state.currentIndex = -1;
    state.songQueue = [];
    state.isShuffle = false;
    state.isAutoplay = true;
}

// ------------------------ Public Interface ------------------------
function initPlayer(container: HTMLElement): PlayerController {
    if (!container) {
        throw new Error("Container is required for player");
    }
    state.container = container;
    createPlayerFooter(container);

    return {
        play: (song: Song, idx: number) => {
            setCurrentIndex(idx);
            playSong(song);
        },
        playNext: playNextSong,
        setQueue: setSongQueue,
        reset: resetPlayer
    };
}

export {
    initPlayer,
    playSong,
    playNextSong,
    setSongQueue,
    setCurrentIndex,
    resetPlayer
};