import { Playlist, Song, Album } from "./types.js";
import { apiRequest, safeFetch, type ApiResponse } from "./api.js";

export const MusicAPI = {
    _cache: {
        playlists: null as Playlist[] | null
    },

    invalidate(): void {
        this._cache.playlists = null;
    },

    playlists: async (force: boolean = false): Promise<Playlist[]> => {
        if (!force && Array.isArray(MusicAPI._cache.playlists)) {
            return MusicAPI._cache.playlists;
        }

        const data = await safeFetch<Playlist>("/musicon/user/playlists");
        MusicAPI._cache.playlists = data;
        return data;
    },

    albums: (): Promise<Album[]> => safeFetch<Album>("/musicon/albums"),
    artistSongs: (id: string): Promise<Song[]> => safeFetch<Song>(`/musicon/artists/${id}/songs`),

    playlistSongs: (playlistID: string, offset: number = 0, limit: number = 20): Promise<Song[]> =>
        safeFetch<Song>(`/musicon/playlists/${playlistID}/songs?skip=${offset}&limit=${limit}`),

    albumSongs: (albumID: string, offset: number = 0, limit: number = 20): Promise<Song[]> =>
        safeFetch<Song>(`/musicon/albums/${albumID}/songs?skip=${offset}&limit=${limit}`),

    recommendedSongs: (): Promise<Song[]> => safeFetch<Song>("/musicon/recommended"),
    recommendedAlbums: (): Promise<Album[]> => safeFetch<Album>("/musicon/recommended/albums"),
    personalizedRecommendations: (): Promise<Song[]> => safeFetch<Song>("/musicon/recommendations?based_on=recently_played"),

    createPlaylist: (body: { name: string }): Promise<ApiResponse> =>
        apiRequest("/musicon/playlists", "POST", body),

    addSongToPlaylist: (playlistID: string, body: { songid: string }): Promise<ApiResponse> =>
        apiRequest(`/musicon/playlists/${playlistID}/songs`, "POST", body),

    removePlaylist: (playlistID: string): Promise<ApiResponse> =>
        apiRequest(`/musicon/playlists/${playlistID}`, "DELETE"),

    removeSongFromPlaylist: (playlistID: string, songid: string): Promise<ApiResponse> =>
        apiRequest(`/musicon/playlists/${playlistID}/songs/${songid}`, "DELETE"),

    likedSongs: (): Promise<Song[]> =>
        safeFetch<Song>("/musicon/user/liked"),

    likeSong: (songid: string): Promise<ApiResponse> =>
        apiRequest(`/musicon/user/liked/${songid}`, "POST"),

    unlikeSong: (songid: string): Promise<ApiResponse> =>
        apiRequest(`/musicon/user/liked/${songid}`, "DELETE")
};