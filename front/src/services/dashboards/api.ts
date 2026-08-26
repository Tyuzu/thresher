import { apiFetch } from "../../api/api.js";

export async function getFarmDashboard(): Promise<any> {
  return await apiFetch("/dash/farms", "GET");
}

export default {
  getFarmDashboard
};
