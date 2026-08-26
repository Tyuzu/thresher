import { apiFetch } from "../../api/api.js";

export async function getArtist(artistID: string | number) {
  return (await apiFetch(`/artists/${artistID}`, "GET"));
}

export async function listArtists(offset = 0, limit = 5000) {
  return (await apiFetch(`/artists?offset=${offset}&limit=${limit}`, "GET"));
}

export async function getArtistSongs(artistID: string | number) {
  return (await apiFetch(`/artists/${artistID}/songs`, "GET"));
}

export async function deleteArtistSong(artistID: string | number, songId: string | number) {
  return (await apiFetch(`/artists/${artistID}/songs/${encodeURIComponent(String(songId))}`, "DELETE"));
}

export async function getAlbums(artistID: string | number) {
  return (await apiFetch(`/artists/${artistID}/albums`, "GET"));
}

export async function getMerch(artistID: string | number) {
  return (await apiFetch(`/artists/${artistID}/merch`, "GET"));
}

export async function getEvents(artistID: string | number) {
  return (await apiFetch(`/artists/${artistID}/events`, "GET"));
}

export async function createEvent(artistID: string | number, data: unknown) {
  return (await apiFetch(`/artists/${artistID}/events`, "POST", data));
}

export async function addArtistToEvent(artistID: string | number, data: unknown) {
  return (await apiFetch(`/artists/${artistID}/events/addtoevent`, "PUT", data));
}

export async function createArtist(formData: unknown) {
  return (await apiFetch(`/artists`, "POST", formData));
}

export async function updateArtist(artistID: string | number, formData: unknown) {
  return (await apiFetch(`/artists/${artistID}`, "PUT", formData));
}

export async function deleteArtist(artistID: string | number) {
  return (await apiFetch(`/artists/${artistID}`, "DELETE"));
}

export async function getMembers(artistID: string | number) {
  const artist = await apiFetch(`/artists/${artistID}`, "GET");
  return artist?.members ?? [];
}

export async function deleteMember(artistID: string | number, memberID: string | number) {
  return (await apiFetch(`/artists/${artistID}/members/${memberID}`, "DELETE"));
}

export async function addMember(artistID: string | number, payload: unknown) {
  return (await apiFetch(`/artists/${artistID}/members`, "POST", payload));
}

export async function updateMember(artistID: string | number, memberID: string | number, payload: unknown) {
  return (await apiFetch(`/artists/${artistID}/members/${memberID}`, "PUT", payload));
}

export async function saveSong(artistID: string | number, songId: string | number | null, payload: unknown, isEdit = false, options: any = {}) {
  const url = isEdit
    ? `/artists/${artistID}/songs/${encodeURIComponent(String(songId))}/edit`
    : `/artists/${artistID}/songs`;
  const method = isEdit ? "PUT" : "POST";
  return await apiFetch(url, method as any, payload, options);
}

export default {
  getArtist,
  listArtists,
  getArtistSongs,
  deleteArtistSong,
  getAlbums,
  getMerch,
  getEvents,
  createEvent,
  addArtistToEvent,
  createArtist,
  updateArtist,
  deleteArtist,
  deleteMember,
  addMember,
  updateMember,
  saveSong
};
