import { apiFetch } from "../../api/api.js";
import type { EntityItem, EntityType } from "./types.js";

export async function fetchUserProfileData(
  username: string,
  entityType: EntityType
): Promise<EntityItem[]> {
  if (typeof username !== "string" || !username.trim()) {
    throw new Error("Username is required.");
  }

  if (typeof entityType !== "string" || !entityType.trim()) {
    throw new Error("Entity type is required.");
  }

  const encodedUsername = encodeURIComponent(username.trim());
  const encodedEntityType = encodeURIComponent(entityType.trim());

  try {
    const response = await apiFetch<EntityItem[]>(
      `/user/${encodedUsername}/data?entity_type=${encodedEntityType}`,
      "GET"
    );
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error(`Error fetching ${entityType} data for user:`, error);
    throw error;
  }
}

export default {
  fetchUserProfileData
};
