import { apiFetch } from "../../api/api.js";

export async function getComments(entityType: string, entityId: string | number, sort: "old" | "new" = "new", page: number = 1): Promise<any> {
  return await apiFetch(`/comments/${entityType}/${entityId}?sort=${sort}&page=${page}`);
}

export async function createComment(entityType: string, entityId: string | number, content: string): Promise<any> {
  return await apiFetch(`/comments/${entityType}/${entityId}`, "POST", { content });
}

export default {
  getComments,
  createComment
};
