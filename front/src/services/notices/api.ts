import { apiFetch } from "../../api/api.js";

export interface Notice {
  noticeid?: string | number;
  title?: string;
  content?: string;
  summary?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface DeleteNoticeResponse {
  success?: boolean;
}

export async function fetchNotices(entityType: string, entityId: string | number): Promise<Notice[]> {
  const res: unknown = await apiFetch(`/notices/${entityType}/${entityId}`, "GET");
  return Array.isArray(res) ? (res as Notice[]) : [];
}

export async function createNotice(
  entityType: string,
  entityId: string | number,
  data: { title: string; content: string }
): Promise<Notice | null> {
  return apiFetch<Notice>(`/notices/${entityType}/${entityId}`, "POST", data);
}

export async function updateNotice(
  entityType: string,
  entityId: string | number,
  noticeId: string | number,
  data: { title: string; content: string }
): Promise<Notice | null> {
  return apiFetch<Notice>(`/notices/${entityType}/${entityId}/${noticeId}`, "PUT", data);
}

export async function deleteNotice(
  entityType: string,
  entityId: string | number,
  noticeId: string | number
): Promise<DeleteNoticeResponse | null> {
  return apiFetch<DeleteNoticeResponse>(`/notices/${entityType}/${entityId}/${noticeId}`, "DELETE");
}
