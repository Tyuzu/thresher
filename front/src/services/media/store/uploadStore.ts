/* ======================================================
   TYPES & INTERFACES
====================================================== */

export type UploadStatus =
    | "queued"
    | "uploading"
    | "done"
    | "error"
    | "canceled";

export interface UploadProgressItem {
    id: string;
    fileName?: string;
    status: UploadStatus;
    progress: number;
    [key: string]: unknown;
}

export type UploadStoreChanges = Partial<Omit<UploadProgressItem, "id">>;

export type UploadControllerMap = Record<string, XMLHttpRequest | undefined>;

export interface IUploadStore {
    uploads: UploadProgressItem[];
    controllers: UploadControllerMap;
    update: (id: string, changes: UploadStoreChanges) => void;
    remove: (id: string) => void;
    clear: () => void;
}

/* ======================================================
   UPLOAD STORE
====================================================== */

export const UploadStore: IUploadStore = {
    uploads: [],
    controllers: {},

    /**
     * Updates an existing upload item's properties by ID
     */
    update(id: string, changes: UploadStoreChanges): void {
        this.uploads = this.uploads.map((u) =>
            u.id === id ? { ...u, ...changes } : u
        );
    },

    /**
     * Aborts an active request (if present) and removes the item from store
     */
    remove(id: string): void {
        const xhr = this.controllers[id];
        if (xhr) {
            xhr.abort();
        }
        delete this.controllers[id];

        this.uploads = this.uploads.filter((u) => u.id !== id);
    },

    /**
     * Clears all uploads and resets controller map
     */
    clear(): void {
        this.uploads = [];
        this.controllers = {};
    }
};

export default UploadStore;