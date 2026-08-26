import { apiFetch } from "../../../api/api.js";
import { FILEDROP_URL, getState } from "../../../state/state.js";
import { UploadStore } from "../store/uploadStore.js";

/* =========================
   TYPES & INTERFACES
========================= */

export interface MediaItem {
    mediaid: string | number;
    creatorid?: string | number;
    url?: string;
    type?: "image" | "video" | string;
    caption?: string;
    captionlang?: string;
    extn?: string;
    [key: string]: unknown;
}

export interface MediaUploadResult {
    filename?: string;
    key?: string;
    url?: string;
    id?: string | number;
    [key: string]: unknown;
}

export interface UploadItem {
    id: string;
    file: File;
    entityType: string;
    entityId?: string | number;
    key?: string;
}

export interface UploadOptions {
    entityType?: string;
    entityId?: string | number;
    concurrency?: number;
    retry?: number;
    key?: string | ((file: File) => string);
}

export interface QueueResult {
    error?: string;
    [key: string]: unknown;
}

export interface MediaApi {
    fetchMedia: <T = unknown>(entityType: string, entityId: string | number) => Promise<T>;
    deleteMedia: <T = unknown>(mediaId: string | number, entityType: string, entityId: string | number) => Promise<T>;
    postMedia: <T = unknown>(entityType: string, entityId: string | number, payload: unknown) => Promise<T>;
}

/* =========================
   API - Service endpoint factory
========================= */

export function createMediaApi(service = "media"): MediaApi {
    return {
        async fetchMedia<T = unknown>(entityType: string, entityId: string | number): Promise<T> {
            return await apiFetch<T>(`/${service}/${entityType}/${entityId}`);
        },

        async deleteMedia<T = unknown>(
            mediaId: string | number,
            entityType: string,
            entityId: string | number
        ): Promise<T> {
            return await apiFetch<T>(
                `/${service}/${entityType}/${entityId}/${mediaId}`,
                "DELETE"
            );
        },

        async postMedia<T = unknown>(
            entityType: string,
            entityId: string | number,
            payload: unknown
        ): Promise<T> {
            return await apiFetch<T>(
                `/${service}/${entityType}/${entityId}`,
                "POST",
                payload
            );
        }
    };
}

const defaultApi = createMediaApi("media");

export const fetchMedia = defaultApi.fetchMedia.bind(defaultApi);
export const deleteMedia = defaultApi.deleteMedia.bind(defaultApi);
export const postMedia = defaultApi.postMedia.bind(defaultApi);

/* =========================
   FileDrop Upload (single)
========================= */

export function uploadFile(u: UploadItem): Promise<MediaUploadResult> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        UploadStore.controllers[u.id] = xhr;

        const formData = new FormData();
        const key = (u.key || "file").toLowerCase();

        formData.append(key, u.file);
        formData.append("entityType", u.entityType);
        formData.append("entityId", String(u.entityId || ""));

        UploadStore.update(u.id, {
            status: "uploading",
            progress: 0
        });

        xhr.upload.onprogress = (e: ProgressEvent) => {
            if (e.lengthComputable) {
                UploadStore.update(u.id, {
                    progress: Math.round((e.loaded / e.total) * 100)
                });
            }
        };

        xhr.onload = () => {
            delete UploadStore.controllers[u.id];

            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);

                    UploadStore.update(u.id, {
                        status: "done",
                        progress: 100
                    });

                    resolve(Array.isArray(data) ? data[0] : data);
                } catch {
                    UploadStore.update(u.id, { status: "error" });
                    reject(new Error("Invalid FILEDROP response"));
                }
                return;
            }

            UploadStore.update(u.id, { status: "error" });

            const error = new Error(
                xhr.responseText || xhr.statusText || "Upload failed"
            ) as Error & { status?: number };

            error.status = xhr.status;
            reject(error);
        };

        xhr.onerror = () => {
            UploadStore.update(u.id, { status: "error" });
            reject(new Error("Network error"));
        };

        xhr.onabort = () => {
            UploadStore.update(u.id, { status: "canceled" });
            reject(new Error("Upload canceled"));
        };

        xhr.open("POST", FILEDROP_URL);

        const token = getState("token");
        if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }

        xhr.send(formData);
    });
}

/* =========================
   Concurrency Queue
========================= */

async function runUploadQueue<T>(
    items: UploadItem[],
    worker: (item: UploadItem) => Promise<T>,
    concurrency = 3
): Promise<(T | QueueResult)[]> {
    const results: (T | QueueResult)[] = new Array(items.length);
    let index = 0;

    async function next(): Promise<void> {
        if (index >= items.length) return;

        const currentIndex = index++;
        const item = items[currentIndex];

        try {
            results[currentIndex] = await worker(item);
        } catch (err) {
            const error = err as Error;
            results[currentIndex] = {
                error: error.message || String(err)
            };
        }

        return next();
    }

    const workers = Array.from({ length: concurrency }, () => next());
    await Promise.all(workers);

    return results;
}

/* =========================
   Retry Wrapper
========================= */

async function uploadWithRetry(
    item: UploadItem,
    retries = 2
): Promise<MediaUploadResult> {
    try {
        return await uploadFile(item);
    } catch (err) {
        const error = err as Error & { status?: number };

        if (error.status === 401 || error.status === 403) {
            throw error;
        }

        if (retries > 0) {
            return uploadWithRetry(item, retries - 1);
        }

        throw error;
    }
}

/* =========================
   Upload Multiple Files
========================= */

export async function uploadFiles(
    files: FileList | File[],
    options: UploadOptions = {}
): Promise<(MediaUploadResult | QueueResult)[]> {
    const {
        entityType = "media",
        entityId = "",
        concurrency = 3,
        retry = 0,
        key
    } = options;

    const items: UploadItem[] = Array.from(files).map((file) => {
        const id = crypto.randomUUID();

        UploadStore.update(id, {
            fileName: file.name,
            progress: 0,
            status: "queued"
        });

        return {
            id,
            file,
            entityType,
            entityId,
            key: typeof key === "function" ? key(file) : key || "file"
        };
    });

    const worker =
        retry > 0
            ? (item: UploadItem) => uploadWithRetry(item, retry)
            : (item: UploadItem) => uploadFile(item);

    return runUploadQueue(items, worker, concurrency);
}

/* =========================
   Cancel Helpers
========================= */

// Define the shape of your controllers map if not typed elsewhere:
type ControllersMap = Record<string, XMLHttpRequest | undefined>;

export function cancelUpload(id: string): void {
    const xhr = (UploadStore.controllers as ControllersMap)[id];

    if (xhr) {
        xhr.abort();
    }
}

export function cancelAllUploads(): void {
    const controllers = UploadStore.controllers as ControllersMap;

    Object.values(controllers).forEach((xhr) => {
        if (xhr) {
            xhr.abort();
        }
    });
}