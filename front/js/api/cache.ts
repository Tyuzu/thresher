/**
 * Request Cache & Deduplication Layer
 * Prevents duplicate requests, caches GET responses safely, and handles LRU eviction.
 */

class RequestCache {
  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000, maxBytes = 10_000_000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxBytes = maxBytes; // 10MB default
    this.bytesUsed = 0;
    this.ttlMs = ttlMs;
  }

  /**
   * Safely estimate size of response in bytes without throwing on unserializable structures
   */
  _estimateSize(obj) {
    try {
      return JSON.stringify(obj).length * 2; // Rough UTF-16 byte size estimate
    } catch {
      return 1024; // Safe fallback size if serialization fails
    }
  }

  /**
   * Deep clone helper to prevent reference mutation bugs
   */
  _clone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(obj);
      } catch {
        // Fallback for non-cloneable objects
      }
    }
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  }

  /**
   * Create cache key from request details
   */
  static createKey(url, method = "GET", userId = "") {
    // Only cache GET requests
    if (method !== "GET") {
      return null;
    }
    return `${userId}:${method}:${url}`;
  }

  /**
   * Get cached response if valid (Refreshes LRU position)
   */
  get(url, method = "GET", userId = "") {
    const key = RequestCache.createKey(url, method, userId);
    if (!key) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.clear(url, method, userId);
      return null;
    }

    // Fix #4: Re-insert entry to refresh LRU order (moves to end of Map)
    this.cache.delete(key);
    this.cache.set(key, entry);

    // Fix #2: Return clone to prevent shared mutation across subscribers
    return this._clone(entry.response);
  }

  /**
   * Store response in cache
   */
  set(url, method = "GET", response, userId = "") {
    const key = RequestCache.createKey(url, method, userId);
    if (!key) return; // Don't cache non-GET requests

    // Fix #1: If key already exists, subtract its previous byte size before replacing
    if (this.cache.has(key)) {
      const existing = this.cache.get(key);
      this.bytesUsed -= existing.size || 0;
      this.cache.delete(key);
    }

    const clonedResponse = this._clone(response);
    const responseSize = this._estimateSize(clonedResponse);

    // Prevent single response from exceeding 50% of max capacity
    if (responseSize > this.maxBytes * 0.5) {
      console.warn(
        `[RequestCache] Response too large (${(responseSize / 1024).toFixed(1)}KB) for cache`
      );
      return;
    }

    // Evict oldest (LRU) entries until we have space by byte size
    while (this.bytesUsed + responseSize > this.maxBytes && this.cache.size > 0) {
      this._evictOldest();
    }

    // Also evict by max count limit
    while (this.cache.size >= this.maxSize && this.cache.size > 0) {
      this._evictOldest();
    }

    this.cache.set(key, {
      response: clonedResponse,
      timestamp: Date.now(),
      size: responseSize,
    });
    this.bytesUsed += responseSize;
  }

  /**
   * Internal helper to evict the oldest LRU entry
   */
  _evictOldest() {
    const firstKey = this.cache.keys().next().value;
    if (!firstKey) return;
    const evicted = this.cache.get(firstKey);
    this.bytesUsed -= evicted?.size || 0;
    if (this.bytesUsed < 0) this.bytesUsed = 0;
    this.cache.delete(firstKey);
  }

  /**
   * Clear specific entry or entire cache
   */
  clear(url = null, method = "GET", userId = "") {
    if (!url) {
      this.cache.clear();
      this.bytesUsed = 0;
      return;
    }
    const key = RequestCache.createKey(url, method, userId);
    if (key) {
      const entry = this.cache.get(key);
      if (entry) {
        this.bytesUsed -= entry.size || 0;
        if (this.bytesUsed < 0) this.bytesUsed = 0;
      }
      this.cache.delete(key);
    }
  }

  /**
   * Get cache stats for monitoring
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      bytesUsed: this.bytesUsed,
      maxBytes: this.maxBytes,
      percentageUsed: ((this.bytesUsed / this.maxBytes) * 100).toFixed(1),
      ttlMs: this.ttlMs,
    };
  }
}

/**
 * In-flight request deduplication
 * Prevents duplicate concurrent idempotent requests
 */
class RequestDeduplicator {
  constructor() {
    this.inFlight = new Map();
  }

  /**
   * Create deduplication key from request details
   */
  static createKey(url, method = "GET") {
    return `${method.toUpperCase()}:${url}`;
  }

  /**
   * Get in-flight request promise or null
   */
  getInFlight(url, method = "GET") {
    // Fix #5: Only deduplicate safe/idempotent methods by default
    if (method.toUpperCase() !== "GET" && method.toUpperCase() !== "HEAD") {
      return null;
    }
    const key = RequestDeduplicator.createKey(url, method);
    return this.inFlight.get(key) || null;
  }

  /**
   * Mark request as in-flight
   */
  startRequest(url, method = "GET", promise) {
    const key = RequestDeduplicator.createKey(url, method);
    this.inFlight.set(key, promise);

    // Auto-cleanup when promise settles
    Promise.resolve(promise)
      .then(() => this.inFlight.delete(key))
      .catch(() => this.inFlight.delete(key));

    return promise;
  }

  /**
   * Clear specific request or all
   */
  clear(url = null, method = "GET") {
    if (!url) {
      this.inFlight.clear();
      return;
    }
    const key = RequestDeduplicator.createKey(url, method);
    this.inFlight.delete(key);
  }

  /**
   * Get count of in-flight requests
   */
  count() {
    return this.inFlight.size;
  }
}

export { RequestCache, RequestDeduplicator };