import { apiFetch } from "../../api/api.js";

export interface PostSummary {
  postid: string | number;
  title?: string;
  category?: string;
  subcategory?: string;
}

export interface Post {
  postid: string | number;
  title?: string;
  type?: string;
  category?: string;
  subcategory?: string;
  createdBy?: string | number;
  username?: string;
  createdAt?: string | number | Date;
  updatedAt?: string | number | Date;
  referenceId?: string | number;
  hashtags?: string[];
  tags?: string[];
  blocks?: unknown[];
  [key: string]: unknown;
}

export interface PostsApiResponse {
  data?: Post[];
  posts?: Post[];
  [key: string]: unknown;
}

export interface RelatedPostsResponse {
  related?: Array<{
    postid: string | number;
    title?: string;
    category?: string;
    subcategory?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export async function fetchPosts(page = 1, limit = 100): Promise<PostsApiResponse | Post[]> {
  return await apiFetch<PostsApiResponse | Post[]>(`/posts?page=${page}&limit=${limit}`);
}

export async function fetchPostById(postId: string | number): Promise<{ post?: Post } | null> {
  return await apiFetch<{ post?: Post }>(`/posts/post/${encodeURIComponent(String(postId))}`);
}

export async function fetchRelatedPosts(
  postId: string | number,
  category?: string,
  subcategory?: string
): Promise<RelatedPostsResponse> {
  const params = new URLSearchParams({
    postid: String(postId),
    category: category || "",
    subcategory: subcategory || ""
  });

  return await apiFetch<RelatedPostsResponse>(
    `/posts/post/${encodeURIComponent(String(postId))}/related?${params.toString()}`
  );
}

export async function savePostRequest(
  formData: FormData,
  isEdit = false,
  postId?: string | number
): Promise<{ postid?: string | number }> {
  const endpoint = isEdit && postId ? `/posts/post/${postId}` : "/posts/post";
  const method = isEdit ? "PATCH" : "POST";
  return await apiFetch<{ postid?: string | number }>(endpoint, method, formData);
}

export default {
  fetchPosts,
  fetchPostById,
  fetchRelatedPosts,
  savePostRequest
};
