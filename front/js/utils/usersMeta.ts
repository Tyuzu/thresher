import { apiFetch } from "../api/api.js";

// Multi-tier caching config
const userCache = new Map();
const inFlightPromises = new Map(); // Tracks active network requests
const TTL_MS = 60 * 60 * 1000; // 1 hour

function getFromLocalStorage(id) {
    const raw = localStorage.getItem(`userMeta:${id}`);
    if (!raw) return null;

    try {
        const record = JSON.parse(raw);
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

function setToLocalStorage(id, data) {
    const record = { data, expires: Date.now() + TTL_MS };
    localStorage.setItem(`userMeta:${id}`, JSON.stringify(record));
}

/**
 * Fetch minimal user info for given IDs with batch deduplication.
 * Returns an object { userid: { username, name, avatar } }
 */
export async function fetchUserMeta(userIds = []) {
    // Fast array sanity check
    if (!Array.isArray(userIds) || userIds.length === 0) return {};

    const result = {};
    const missingIds = [];
    const pendingPromises = [];

    const now = Date.now();

    for (const id of userIds) {
        // 1. Check in-memory cache + validate expiration
        if (userCache.has(id)) {
            const cached = userCache.get(id);
            if (now < cached.expires) {
                result[id] = cached.data;
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
                inFlightPromises.get(id).then((data) => {
                    if (data) result[id] = data;
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
        const networkFetchPromise = (async () => {
            try {
                const res = await apiFetch(`/users/meta?ids=${missingIds.join(",")}`) || {};
                
                // Normalise object shape from apiFetch response data wrapping
                const responseData = res?.data || res; 

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

    // Await all network resolutions (both new batches and older reused requests) concurrently
    if (pendingPromises.length > 0) {
        await Promise.allSettled(pendingPromises);
    }

    return result;
}