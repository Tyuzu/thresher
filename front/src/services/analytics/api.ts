import { apiFetch } from "../../api/api.js";

export interface AnalyticsData {
  name?: string;
  type?: string;
  lastUpdated?: string | number | Date;
  metrics?: Record<string, number | string>;
  trend?: (number | string)[];
  engagement?: Record<string, string | number>;
  insights?: Record<string, string | number>;
  topLocations?: (string | number)[];
}

export async function getAnalytics(entityType = "events", entityId: string | number | null = null): Promise<AnalyticsData | null> {
  const endpoint = entityId ? `/antics/${entityType}/${entityId}` : `/antics/${entityType}/all`;
  const data = (await apiFetch(endpoint)) as AnalyticsData | null;
  return data;
}

export default { getAnalytics };
