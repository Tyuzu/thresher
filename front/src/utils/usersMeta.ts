import { apiFetch } from "../api/api.js";

/* =========================================================
   TYPES & INTERFACES
========================================================= */

export interface UserMeta {
  username: string;
  name: string;
  avatar?: string;
  [key: string]: unknown;
}

export type UserMetaRecord = Record<string, UserMeta | null>;

interface CacheEntry<T> {
  data: T;
  expires: number;
}

/* =========================================================
   CACHE STATE & CONSTANTS
========================================================= */

const userCache = new Map<string, CacheEntry<UserMeta | null>>();
const inFlightPromises = new Map<string, Promise<unknown>>();
const TTL_MS = 60 * 60 * 1000; // 1 hour

/* =========================================================
   LOCAL STORAGE HELPERS
========================================================= */

function getFromLocalStorage(id: string): UserMeta | null {
  const raw = localStorage.getItem(`userMeta:${id}`);
  if (!raw) return null;

  try {
    const record: CacheEntry<UserMeta | null> = JSON.parse(raw);
    if (Date.now() > record.expires) {
      localStorage.removeItem(`userMeta:${id}`);
      return null;
    }
    return record.data;
  } catch {
    localStorage.removeItem(`userMeta:${id}`);
    return null;
  }
}

function setToLocalStorage(id: string, data: UserMeta | null): void {
  const record: CacheEntry<UserMeta | null> = {
    data,
    expires: Date.now() + TTL_MS
  };
  localStorage.setItem(`userMeta:${id}`, JSON.stringify(record));
}

/* =========================================================
   FETCH USER META BATCHING
========================================================= */

/**
 * Fetch minimal user info for given IDs with batch deduplication.
 * Returns an object { [userid]: { username, name, avatar } }
 */
export async function fetchUserMeta(
  userIds: string[] = []
): Promise<Record<string, UserMeta>> {
  if (!Array.isArray(userIds) || userIds.length === 0) return {};

  const result: Record<string, UserMeta> = {};
  const missingIds: string[] = [];
  const pendingPromises: Promise<unknown>[] = [];

  const now = Date.now();

  for (const id of userIds) {
    // 1. Check in-memory cache + validate expiration
    if (userCache.has(id)) {
      const cached = userCache.get(id)!;
      if (now < cached.expires) {
        if (cached.data) result[id] = cached.data;
        continue;
      } else {
        userCache.delete(id); // Evict expired memory reference
      }
    }

    // 2. Check localStorage
    const local = getFromLocalStorage(id);
    if (local !== null) {
      // Re-populate memory cache matching local storage remaining lifespan
      userCache.set(id, { data: local, expires: now + TTL_MS });
      result[id] = local;
      continue;
    }

    // 3. Check if this exact ID is already mid-flight on the network
    if (inFlightPromises.has(id)) {
      pendingPromises.push(
        inFlightPromises.get(id)!.then(() => {
          const cached = userCache.get(id);
          if (cached?.data) result[id] = cached.data;
        })
      );
      continue;
    }

    // 4. Truly missing
    missingIds.push(id);
  }

  // If there are unique missing IDs, bundle them into a single deduplicated request
  if (missingIds.length > 0) {
    // Create a single shared promise context for this batch request
    const networkFetchPromise = (async (): Promise<void> => {
      try {
        const res = (await apiFetch(`/users/meta?ids=${missingIds.join(",")}`)) || {};

        // Normalise object shape from apiFetch response data wrapping
        const responseData: UserMetaRecord = (res as { data?: UserMetaRecord }).data || (res as UserMetaRecord);

        missingIds.forEach((id) => {
          const userData = responseData[id] || null; // Cache null for 404/missing accounts

          userCache.set(id, { data: userData, expires: Date.now() + TTL_MS });
          setToLocalStorage(id, userData);

          if (userData) result[id] = userData;
        });
      } catch (err) {
        console.error("Failed to fetch user meta for batch:", missingIds, err);
      } finally {
        // Clear the inflight trackers when done
        missingIds.forEach((id) => inFlightPromises.delete(id));
      }
    })();

    // Map the single network promise to all specific IDs in this run
    missingIds.forEach((id) => inFlightPromises.set(id, networkFetchPromise));
    pendingPromises.push(networkFetchPromise);
  }

  // Await all network resolutions concurrently
  if (pendingPromises.length > 0) {
    await Promise.allSettled(pendingPromises);
  }

  return result;
}