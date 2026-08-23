/* eslint-disable no-unused-vars */
import { apiFetch } from "../api/api.js";
import { createElement, ElementAttributes } from "../components/createElement.js";
import { FILEDROP_URL } from "../state/state.js";
import Notify from "../components/ui/Notify.js";

/* =========================================================
   TYPES & INTERFACES
========================================================= */

export type AllowedMimeType = "image/jpeg" | "image/png";

export interface ChunkUploadMeta {
  fileName: string;
  chunkIndex: number;
  totalChunks: number;
  entityType: string;
  pictureType: string;
  entityId: string | number;
  token?: string;
}

export interface UploadFileOptions {
  file: File;
  entityType: string;
  pictureType: string;
  entityId: string | number;
  token?: string;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  maxRetries?: number;
}

export interface UploadResult {
  fileName: string;
  status: "uploaded";
}

export interface FailedUpload {
  file: File;
  error: string;
}

export interface QueueUploadOptions {
  files: File[];
  entityType: string;
  pictureType: string;
  entityId: string | number;
  token?: string;
  containerEl?: HTMLElement | null;
  onComplete?: (uploaded: UploadResult[]) => void;
  onError?: (failed: FailedUpload[]) => void;
  concurrency?: number;
}

export interface QueueUploadControl {
  cancelAll: () => void;
}

export interface FileExistsOptions {
  entityType: string;
  pictureType: string;
  entityId: string | number;
  fileName: string;
}

/* =========================================================
   CONSTANTS & VALIDATION
========================================================= */

const CHUNK_SIZE = 256 * 1024; // 256KB
const ALLOWED_TYPES: AllowedMimeType[] = ["image/jpeg", "image/png"];

/**
 * Validates a file's underlying MIME signature by checking its binary magic numbers.
 * Safely handles validation without blowing out the JavaScript call stack.
 */
async function validateFile(file: File): Promise<void> {
  const blob = file.slice(0, 4);
  const buffer = await blob.arrayBuffer();
  const arr = new Uint8Array(buffer);

  let hexSignature = "";
  for (let i = 0; i < arr.length; i++) {
    hexSignature += arr[i].toString(16).toUpperCase().padStart(2, "0");
  }

  let derivedMime: string = file.type;
  if (hexSignature.startsWith("89504E47")) {
    derivedMime = "image/png";
  } else if (hexSignature.startsWith("FFD8FF")) {
    derivedMime = "image/jpeg";
  }

  if (!ALLOWED_TYPES.includes(derivedMime as AllowedMimeType)) {
    throw new Error(`Unsupported file signature format variant: ${file.type}`);
  }
}

/* =========================================================
   CHUNK & FILE UPLOAD PIPELINE
========================================================= */

export async function uploadChunk<T = unknown>(
  formData: FormData,
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(`${FILEDROP_URL}/uploads/chunk`, {
    method: "POST",
    body: formData,
    signal
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown upload server exception.");
    throw new Error(`Chunk upload failed: ${res.status} - ${errorText}`);
  }
  return res.json() as Promise<T>;
}

export async function uploadFileInChunks({
  file,
  entityType,
  pictureType,
  entityId,
  token,
  signal,
  onProgress = () => {},
  maxRetries = 3
}: UploadFileOptions): Promise<UploadResult> {
  await validateFile(file);

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let uploadedBytes = 0;

  for (let i = 0; i < totalChunks; i++) {
    if (signal?.aborted) {
      throw new DOMException("Upload aborted by user action context.", "AbortError");
    }

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const meta: ChunkUploadMeta = {
      fileName: file.name,
      chunkIndex: i,
      totalChunks,
      entityType,
      pictureType,
      entityId,
      token
    };

    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("meta", JSON.stringify(meta));

    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        await uploadChunk(formData, signal);
        success = true;
      } catch (err: any) {
        if (err.name === "AbortError" || signal?.aborted) {
          throw new DOMException("Upload safely cancelled.", "AbortError");
        }

        attempt++;
        if (attempt === maxRetries) throw err;

        await new Promise((res) => setTimeout(res, 500 * attempt));
      }
    }

    uploadedBytes += chunk.size;
    const percent = Math.round((uploadedBytes / file.size) * 100);
    onProgress(percent);
  }

  return { fileName: file.name, status: "uploaded" };
}

/* =========================================================
   QUEUE WORKER POOL
========================================================= */

export async function uploadImagesWithQueue({
  files,
  entityType,
  pictureType,
  entityId,
  token,
  containerEl,
  onComplete = () => {},
  onError = () => {},
  concurrency = 3
}: QueueUploadOptions): Promise<QueueUploadControl> {
  const workingQueue: File[] = [...files];
  const uploaded: UploadResult[] = [];
  const failed: FailedUpload[] = [];
  const activeControllers = new Set<AbortController>();

  function createProgressBar(fileName: string): HTMLProgressElement {
    const label = createElement("div", {}, `Uploading ${fileName}`);
    const bar = createElement("progress", { max: "100", value: "0" });
    const wrapper = createElement("div", { class: "upload-progress-wrapper" }, [label, bar]);
    
    if (containerEl) containerEl.appendChild(wrapper);
    return bar;
  }

  async function workerInstance(): Promise<void> {
    while (workingQueue.length > 0) {
      const file = workingQueue.shift();
      if (!file) continue;

      if (!ALLOWED_TYPES.includes(file.type as AllowedMimeType)) {
        failed.push({ file, error: "MIME format layout rejected context rules." });
        Notify(`Skipped invalid file format: ${file.name}`, { type: "warning", duration: 3000 });
        continue;
      }

      const controller = new AbortController();
      activeControllers.add(controller);
      const bar = createProgressBar(file.name);

      try {
        const result = await uploadFileInChunks({
          file,
          entityType,
          pictureType,
          entityId,
          token,
          signal: controller.signal,
          onProgress: (percent: number) => {
            if (bar) bar.value = percent;
          }
        });
        uploaded.push(result);
      } catch (err: any) {
        failed.push({ file, error: err.message || "Upload error" });
        if (bar) {
          bar.value = 0;
          bar.classList.add("error");
        }
        if (err.name !== "AbortError") {
          Notify(`Upload failed: ${file.name}`, { type: "error", duration: 3000, dismissible: true });
        }
      } finally {
        activeControllers.delete(controller);
      }
    }
  }

  const activeWorkersCount = Math.min(concurrency, workingQueue.length);
  const workerPromises = Array.from({ length: activeWorkersCount }, () => workerInstance());

  await Promise.all(workerPromises);

  if (uploaded.length > 0) onComplete(uploaded);
  if (failed.length > 0) onError(failed);

  return {
    cancelAll: () => {
      activeControllers.forEach((ctrl) => ctrl.abort());
      activeControllers.clear();
      workingQueue.length = 0;
    }
  };
}

/* =========================================================
   EXISTENCE CHECK
========================================================= */

export async function fileAlreadyExists({
  entityType,
  pictureType,
  entityId,
  fileName
}: FileExistsOptions): Promise<boolean> {
  try {
    const res = await fetch(
      `${FILEDROP_URL}/uploads/exists?entityType=${entityType}&pictureType=${pictureType}&entityId=${entityId}&fileName=${encodeURIComponent(fileName)}`,
      { method: "HEAD" }
    );
    return res.ok;
  } catch {
    return false;
  }
}