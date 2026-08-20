const DB_NAME = "AppNotificationsDB";
const DB_VERSION = 1;
const STORE_NAME = "system_logs";

/**
 * Initializes and opens the IndexedDB database instance.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
      };

      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Retrieve a single log by ID.
 */
export async function get(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Store a new log or update an existing log.
 *
 * Uses IndexedDB's put(), which inserts when the ID doesn't exist
 * and updates when the ID already exists.
 */
export async function set(value) {
  if (!value || value.id == null) {
    throw new Error("IndexedDB log must contain an id.");
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const request = store.put(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Explicit update alias.
 *
 * Kept separate from set() so callers can use the more descriptive
 * update() name when modifying an existing log.
 */
export async function update(value) {
  return set(value);
}

/**
 * Explicit put alias.
 *
 * Useful for compatibility with code that expects IndexedDB-style
 * put() semantics.
 */
export async function put(value) {
  return set(value);
}

/**
 * Retrieve all system log entries.
 */
export async function getAll() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Clear all entries from the store.
 */
export async function clear() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const request = tx.objectStore(STORE_NAME).clear();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Helper to add a new system log.
 *
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {"success"|"error"|"info"} options.type
 */
export async function addSystemLog({
  title,
  message,
  type = "info",
}) {
  const logItem = {
    id: `log-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  await set(logItem);

  return logItem;
}