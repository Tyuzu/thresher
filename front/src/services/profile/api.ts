import { apiFetch } from "../../api/api.js";

export interface UserProfile {
  userid?: string | number;
  id?: string | number;
  username?: string;
  name?: string;
  email?: string;
  bio?: string;
  phone_number?: string;
  [key: string]: unknown;
}

export interface SuggestedUser {
  userid: string | number;
  username?: string;
  bio?: string;
  [key: string]: unknown;
}

export async function fetchMyProfile(): Promise<UserProfile | null> {
  return await apiFetch<UserProfile | null>("/profile/profile", "GET");
}

export async function fetchUserProfileByUsername(username: string): Promise<UserProfile | null> {
  if (typeof username !== "string" || !username.trim()) {
    return null;
  }

  const encodedUsername = encodeURIComponent(username.trim());
  return await apiFetch<UserProfile | null>(`/user/${encodedUsername}`, "GET");
}

export async function fetchUserProfileData(
  username: string,
  entityType: string
): Promise<unknown> {
  if (typeof username !== "string" || !username.trim()) {
    throw new Error("Username is required.");
  }

  if (typeof entityType !== "string" || !entityType.trim()) {
    throw new Error("Entity type is required.");
  }

  const encodedUsername = encodeURIComponent(username.trim());
  const encodedEntityType = encodeURIComponent(entityType.trim());

  return await apiFetch(
    `/user/${encodedUsername}/data?entity_type=${encodedEntityType}`,
    "GET"
  );
}

export async function updateProfileData(updatedFields: Record<string, string>): Promise<Record<string, unknown> | null> {
  const formData = new FormData();
  Object.entries(updatedFields).forEach(([key, val]) => {
    formData.append(key, val);
  });

  return await apiFetch<Record<string, unknown> | null>("/profile/edit", "PUT", formData);
}

export async function deleteProfileRequest(): Promise<void> {
  await apiFetch("/profile/delete", "DELETE");
}

export async function fetchFollowSuggestions(userid: string | number): Promise<SuggestedUser[]> {
  const suggestions = await apiFetch<SuggestedUser[]>(`/suggestions/follow?userid=${userid}`);
  return Array.isArray(suggestions) ? suggestions : [];
}

export async function toggleActionRequest(
  apiEndpoint: string,
  method: "PUT" | "DELETE"
): Promise<Response | unknown | undefined> {
  return await apiFetch<Response | unknown>(apiEndpoint, method);
}

export default {
  fetchMyProfile,
  fetchUserProfileByUsername,
  fetchUserProfileData,
  updateProfileData,
  deleteProfileRequest,
  fetchFollowSuggestions,
  toggleActionRequest
};
