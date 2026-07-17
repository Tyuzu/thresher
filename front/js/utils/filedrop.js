/* eslint-disable no-unused-vars */
import { apiFetch } from "../api/api";
import { createElement } from "../components/createElement";
import { FILEDROP_URL } from "../state/state";
import Notify from "../components/ui/Notify.mjs";

const CHUNK_SIZE = 256 * 1024; // 256KB
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

/**
 * Validates a file's underlying MIME signature by checking its binary magic numbers.
 * Safely handles validation without blowing out the JavaScript call stack.
 */
async function validateFile(file) {
    // Read the first 4 bytes of the file to identify its file signature
    const blob = file.slice(0, 4);
    const buffer = await blob.arrayBuffer();
    const arr = new Uint8Array(buffer);
    
    let hexSignature = "";
    for (let i = 0; i < arr.length; i++) {
        hexSignature += arr[i].toString(16).toUpperCase().padStart(2, "0");
    }

    // Determine the MIME type using known hex byte markers
    let derivedMime = "";
    if (hexSignature.startsWith("89504E47")) {
        derivedMime = "image/png";
    } else if (hexSignature.startsWith("FFD8FF")) {
        derivedMime = "image/jpeg";
    } else {
        // Fall back to the browser-reported type if signature checking is inconclusive
        derivedMime = file.type;
    }

    if (!ALLOWED_TYPES.includes(derivedMime)) {
        throw new Error(`Unsupported file signature format variant: ${file.type}`);
    }
}

export async function uploadChunk(formData, signal) {
    const res = await fetch(`${FILEDROP_URL}/uploads/chunk`, {
        method: "POST",
        body: formData,
        signal
    });

    if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown upload server exception.");
        throw new Error(`Chunk upload failed: ${res.status} - ${errorText}`);
    }
    return res.json();
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
}) {
    await validateFile(file);

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedBytes = 0;

    for (let i = 0; i < totalChunks; i++) {
        // Stop execution immediately if the user cancels the upload
        if (signal?.aborted) {
            throw new DOMException("Upload aborted by user action context.", "AbortError");
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("meta", JSON.stringify({
            fileName: file.name,
            chunkIndex: i,
            totalChunks,
            entityType,
            pictureType,
            entityId,
            token
        }));

        let attempt = 0;
        let success = false;
        
        while (attempt < maxRetries && !success) {
            try {
                await uploadChunk(formData, signal);
                success = true;
            } catch (err) {
                // Do not retry if the operation was explicitly cancelled
                if (err.name === "AbortError" || signal?.aborted) {
                    throw new DOMException("Upload safely cancelled.", "AbortError");
                }
                
                attempt++;
                if (attempt === maxRetries) throw err;
                
                // Exponential backoff delay tracking calculation logic
                await new Promise((res) => setTimeout(res, 500 * attempt));
            }
        }

        uploadedBytes += chunk.size;
        const percent = Math.round((uploadedBytes / file.size) * 100);
        onProgress(percent);
    }

    return { fileName: file.name, status: "uploaded" };
}

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
}) {
    // Standardize deep array copying references safely
    const workingQueue = [...files];
    const uploaded = [];
    const failed = [];
    const activeControllers = new Set();

    function createProgressBar(fileName) {
        const label = createElement("div", {}, [`Uploading ${fileName}`]);
        const bar = createElement("progress", { max: "100", value: "0" });
        const wrapper = createElement("div", { class: "upload-progress-wrapper" }, [label, bar]);
        if (containerEl) containerEl.appendChild(wrapper);
        return bar;
    }

    // Atomic worker pool runner logic context loop execution
    async function workerInstance() {
        while (workingQueue.length > 0) {
            const file = workingQueue.shift();
            if (!file) continue;

            // Pre-validation filtering to prevent unexpected layout shifts
            if (!ALLOWED_TYPES.includes(file.type)) {
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
                    onProgress: (percent) => {
                        if (bar) bar.value = percent;
                    }
                });
                uploaded.push(result);
            } catch (err) {
                failed.push({ file, error: err.message });
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

    // Initialize parallel operational processing slots safely
    const activeWorkersCount = Math.min(concurrency, workingQueue.length);
    const workerPromises = Array.from({ length: activeWorkersCount }, () => workerInstance());
    
    await Promise.all(workerPromises);

    if (uploaded.length > 0) onComplete(uploaded);
    if (failed.length > 0) onError(failed);

    return {
        cancelAll: () => {
            activeControllers.forEach((ctrl) => ctrl.abort());
            activeControllers.clear();
            workingQueue.length = 0; // Completely purge remaining array elements securely
        }
    };
}

export async function fileAlreadyExists({ entityType, pictureType, entityId, fileName }) {
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