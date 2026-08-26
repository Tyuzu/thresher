import { Song } from "./types";

export type RepeatMode = "all" | "one" | "none";

export interface PlayerStateShape {
    audio: HTMLAudioElement | null;
    currentSong: Song | null;
    currentIndex: number;
    queue: Song[];
    repeat: RepeatMode;
    shuffle: boolean;
    volume: number;
    crossfadeDuration: number;
    _fadeInterval: any | null;
}

export interface PlayerInterface {
    play: (song: Song, idx?: number, startTime?: number) => Promise<void>;
    setQueue: (songs: Song[]) => void;
    playNext: () => void;
    playPrev: () => void;
    reset: () => void;
    getState: () => PlayerStateShape;
    _playerInstance?: unknown;
}