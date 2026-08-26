import { apiFetch } from "../../api/api.js";

export async function fetchLatestBaitos() {
  return await apiFetch("/baitos/latest");
}

export async function getApplications() {
  return await apiFetch("/baitos/applications");
}

export async function deleteApplication(appId: string | number) {
  return await apiFetch(`/baitos/applications/${appId}`, "DELETE");
}

export async function getMine() {
  return await apiFetch("/baitos/mine");
}

export async function getApplicants(baitoId: string | number) {
  return await apiFetch(`/baitos/baito/${baitoId}/applicants`, "GET");
}

export async function createBaito(payload: unknown) {
  return await apiFetch("/baitos/baito", "POST", payload);
}

export async function updateBaito(baitoId: string | number, payload: unknown) {
  return await apiFetch(`/baitos/baito/${baitoId}`, "PUT", payload);
}

export async function deleteBaito(baitoId: string | number) {
  return await apiFetch(`/baitos/baito/${baitoId}`, "DELETE");
}

export async function applyToBaito(baitoId: string | number, form: unknown) {
  return await apiFetch(`/baitos/baito/${baitoId}/apply`, "POST", form);
}

export async function reportBaito(baitoId: string | number, payload: unknown) {
  return await apiFetch(`/baitos/baito/${baitoId}/report`, "POST", payload);
}

export async function fetchRelated(category: string, exclude: string | number) {
  return await apiFetch(`/baitos/related?category=${encodeURIComponent(category)}&exclude=${exclude}`);
}

export async function listWorkers(page = 1, limit = 5000) {
  return await apiFetch(`/baitos/workers?page=${page}&limit=${limit}`);
}

export async function getWorker(workerId: string | number) {
  return await apiFetch(`/baitos/worker/${workerId}`);
}

export async function deleteWorker(workerId: string | number) {
  return await apiFetch(`/baitos/worker/${workerId}`, "DELETE");
}

export async function getBaito(baitoId: string | number) {
  return await apiFetch(`/baitos/baito/${baitoId}`);
}

export async function createProfile(payload: unknown) {
  return await apiFetch(`/baitos/profile`, "POST", payload);
}

export async function updateProfile(workerId: string | number, payload: unknown) {
  return await apiFetch(`/baitos/profile/${workerId}`, "PUT", payload);
}

export async function getBookingsForWorker(workerId: string | number) {
  return await apiFetch(`/bookings/bookings?entityType=worker&entityId=${workerId}`);
}

export async function getSlots(entityId: string | number) {
  return await apiFetch(`/bookings/slots?entityId=${entityId}`);
}

export default {
  fetchLatestBaitos,
  getApplications,
  deleteApplication,
  getMine,
  getApplicants,
  createBaito,
  updateBaito,
  deleteBaito,
  applyToBaito,
  reportBaito,
  fetchRelated,
  listWorkers,
  getWorker,
  deleteWorker,
  getBaito,
  createProfile,
  updateProfile,
  getBookingsForWorker,
  getSlots
};
