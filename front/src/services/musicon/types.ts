export interface Song {
    songid: string;
    title?: string;
    genre?: string;
    duration?: string;
    poster?: string | null;
    audioUrl?: string | null;
    audioextn?: string;
    liked?: boolean;
    _playBtn?: HTMLButtonElement;
}

export interface Playlist {
    playlistid: string;
    playlistID?: string; // fallback for inconsistent API naming
    name?: string;
    songs?: Song[];
}

export interface Album {
    albumid: string;
    title?: string;
}

export interface Player {
    play: (song: Song, idx: number) => void;
    setQueue?: (songs: Song[]) => void;
}

export type NotifyOptions = {
    type?: "info" | "error" | "success";
};