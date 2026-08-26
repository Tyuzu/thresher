import { apiFetch } from "../../api/api.js";

export type HashtagPostItem = {
  postid: string | number;
  title?: string;
  type?: "image" | "video" | string;
  media_url?: string | string[];
  [key: string]: unknown;
};

export type HashtagUserItem = {
  username: string;
  display_name?: string;
  [key: string]: unknown;
};

export async function fetchHashtagTopPosts(
  hashtag: string,
  page: number = 0,
  limit: number = 20
): Promise<HashtagPostItem[]> {
  return await apiFetch<HashtagPostItem[]>(`/hashtags/hashtag/${hashtag}/top?page=${page}&limit=${limit}`);
}

export async function fetchHashtagLatestPosts(
  hashtag: string,
  page: number = 0,
  limit: number = 20
): Promise<HashtagPostItem[]> {
  return await apiFetch<HashtagPostItem[]>(`/hashtags/hashtag/${hashtag}/latest?page=${page}&limit=${limit}`);
}

export async function fetchHashtagPeople(
  hashtag: string,
  page: number = 0,
  limit: number = 20
): Promise<HashtagUserItem[]> {
  return await apiFetch<HashtagUserItem[]>(`/hashtags/hashtag/${hashtag}/people?page=${page}&limit=${limit}`);
}

export async function fetchHashtagMedia(
  hashtag: string,
  page: number = 0,
  limit: number = 20
): Promise<HashtagPostItem[]> {
  return await apiFetch<HashtagPostItem[]>(`/hashtags/hashtag/${hashtag}?page=${page}&limit=${limit}`);
}
