import { apiFetch } from "../../api/api.js";

export interface ReportPayload {
  targetId: string;
  targetType: string;
  parentType?: string;
  parentId?: string;
  reason: string;
  notes?: string;
}

export interface AppealPayload {
  targetId: string;
  targetType: string;
  reason: string;
}

export interface ApiResponse {
  reportId?: string;
  appealId?: string;
  error?: string;
}

export async function submitReport(payload: ReportPayload): Promise<ApiResponse> {
  return await apiFetch<ApiResponse>("/report", "POST", payload);
}

export async function submitAppeal(payload: AppealPayload): Promise<ApiResponse> {
  return await apiFetch<ApiResponse>("/appeals", "POST", payload);
}

export default {
  submitReport,
  submitAppeal
};
