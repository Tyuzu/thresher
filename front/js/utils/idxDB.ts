/* =========================================================
   TYPES & INTERFACES
========================================================= */

export type SystemLogType = "success" | "error" | "info" | "warning";

export interface SystemLogEntry {
  id: string | number;
  title: string;
  message: string;
  type: SystemLogType;
  isRead: boolean;
  createdAt: string;
  [key: string]: unknown;
}

export interface AddSystemLogOptions {
  title: string;
  message: string;
  type?: SystemLogType;
}

/* =========================================================
   CONSTANTS & DATABASE INIT
========================================================= */

const DB_NAME = "AppNotificationsDB";
const DB_VERSION = 1;
const STORE_NAME = "system_logs";

/**
 * Initializes and opens the IndexedDB database instance.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;

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

/* =========================================================
   DATA ACCESS LAYER (CRUD)
========================================================= */

/**
 * Retrieve a single log by ID.
 */
export async function get<T extends SystemLogEntry = SystemLogEntry>(
  id: IDBValidKey
): Promise<T | undefined> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as T | undefined);
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
export async function set<T extends SystemLogEntry = SystemLogEntry>(
  value: T
): Promise<IDBValidKey> {
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
 */
export async function update<T extends SystemLogEntry = SystemLogEntry>(
  value: T
): Promise<IDBValidKey> {
  return set(value);
}

/**
 * Explicit put alias.
 */
export async function put<T extends SystemLogEntry = SystemLogEntry>(
  value: T
): Promise<IDBValidKey> {
  return set(value);
}

/**
 * Retrieve all system log entries.
 */
export async function getAll<T extends SystemLogEntry = SystemLogEntry>(): Promise<T[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);

    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Clear all entries from the store.
 */
export async function clear(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const request = tx.objectStore(STORE_NAME).clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.onabort = () => reject(tx.error);
  });
}

/* =========================================================
   DOMAIN HELPERS
========================================================= */

/**
 * Helper to add a new system log.
 */
export async function addSystemLog({
  title,
  message,
  type = "info"
}: AddSystemLogOptions): Promise<SystemLogEntry> {
  const logItem: SystemLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  await set(logItem);

  return logItem;
}