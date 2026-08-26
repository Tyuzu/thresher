import { apiFetch } from "../../api/api.js";
import type { Review } from "./reviewTypes.js";

export interface ReviewPayload {
  rating: number;
  comment: string;
}

export async function fetchReviews(
  entityType: string,
  entityId: string | number
): Promise<Review[]> {
  return await apiFetch<Review[]>(`/reviews/${entityType}/${entityId}`);
}

export async function createReviewRequest(
  entityType: string,
  entityId: string | number,
  payload: ReviewPayload
): Promise<void> {
  await apiFetch<void>(`/reviews/${entityType}/${entityId}`, "POST", payload);
}

export async function updateReviewRequest(
  entityType: string,
  entityId: string | number,
  reviewId: string | number,
  payload: ReviewPayload
): Promise<void> {
  await apiFetch<void>(`/reviews/${entityType}/${entityId}/${reviewId}`, "PUT", payload);
}

export async function deleteReviewRequest(
  entityType: string,
  entityId: string | number,
  reviewId: string | number
): Promise<void> {
  await apiFetch<void>(`/reviews/${entityType}/${entityId}/${reviewId}`, "DELETE");
}

export default {
  fetchReviews,
  createReviewRequest,
  updateReviewRequest,
  deleteReviewRequest
};
