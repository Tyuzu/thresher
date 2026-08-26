import { apiFetch } from "../../api/api.js";

export async function fetchJobsByEntity(entityType: string, entityId: string | number): Promise<any> {
  return await apiFetch(`/jobs/${entityType}/${entityId}`);
}

export async function createJob(entityType: string, entityId: string | number, payload: Record<string, any>): Promise<any> {
  return await apiFetch(`/jobs/${entityType}/${entityId}`, "POST", payload);
}

export async function fetchUserById(userId: string): Promise<any> {
  return await apiFetch(`/users/${userId}`, "GET");
}
