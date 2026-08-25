import { getState } from "../../state/state.js";

/* ───────────────────────────────────────── */
/* Types & Interfaces                       */
/* ───────────────────────────────────────── */

export type UploadStatus = "idle" | "uploading" | "done" | "error" | "canceled";

export interface UploadItem {
  id: string;
  file: File;
  key?: string;
  entityType: string;
  entityId?: string | number;
  onProgress?: (percent: number) => void;
}

export interface MediaUploadResult {
  mediaid?: string;
  filename: string;
  extension: string;
  url?: string;
  mimeType?: string;
  size?: number;
  [key: string]: unknown;
}

export interface UploadStoreState {
  status: UploadStatus;
  progress?: number;
}

export interface CustomError extends Error {
  status?: number;
}

/* ───────────────────────────────────────── */
/* Store & Constants                        */
/* ───────────────────────────────────────── */

export const FILEDROP_URL = "/api/v1/media/upload";

export const UploadStore = {
  controllers: {} as Record<string, XMLHttpRequest>,
  state: {} as Record<string, UploadStoreState>,

  update(id: string, updates: Partial<UploadStoreState>): void {
    this.state[id] = {
      ...this.state[id],
      ...updates
    };
  },

  abort(id: string): void {
    if (this.controllers[id]) {
      this.controllers[id].abort();
      delete this.controllers[id];
    }
  }
};

/* ───────────────────────────────────────── */
/* Upload Implementation                    */
/* ───────────────────────────────────────── */

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
        const percent = Math.round((e.loaded / e.total) * 100);

        UploadStore.update(u.id, {
          progress: percent
        });

        // Trigger individual callback if supplied by call-site
        if (typeof u.onProgress === "function") {
          u.onProgress(percent);
        }
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

      const error: CustomError = new Error(
        xhr.responseText || xhr.statusText || "Upload failed"
      );

      error.status = xhr.status;
      reject(error);
    };

    xhr.onerror = () => {
      delete UploadStore.controllers[u.id];
      UploadStore.update(u.id, { status: "error" });
      reject(new Error("Network error"));
    };

    xhr.onabort = () => {
      delete UploadStore.controllers[u.id];
      UploadStore.update(u.id, { status: "canceled" });
      reject(new Error("Upload canceled"));
    };

    xhr.open("POST", FILEDROP_URL);

    const token = getState("token") as string | undefined;
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.send(formData);
  });
}

export function uploadAttachment(chatid: string, fileInput: HTMLElement) {
  
}