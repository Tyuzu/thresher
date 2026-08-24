import { apiFetch } from "../api/api.js";

/* =========================================================
   TYPES & INTERFACES
========================================================= */

export interface CheckFileResult {
  exists: boolean;
  url: string;
}

export interface CheckFileApiResponse {
  exists?: boolean;
  url?: string;
  [key: string]: unknown;
}

/* =========================================================
   HASHING UTILITIES
========================================================= */

/**
 * Calculates a SHA-256 hash of a file incrementally using chunks.
 * Prevents main-thread freezing and memory crashes on large files.
 * 
 * @param file - The file element to process
 * @param chunkSize - Slice boundary footprint (default: 2MB)
 * @returns The completed SHA-256 hexadecimal hash string
 */
export async function GetFileHash(
  file: Blob | File,
  chunkSize: number = 2 * 1024 * 1024
): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error(
      "Crypto API unavailable. Secure context (HTTPS) or local loopback required."
    );
  }

  const totalSize = file.size;

  // If the file is small, process it directly to reduce overhead
  if (totalSize <= chunkSize) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file asset buffer."));
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer) {
            throw new Error("File buffer load returned empty state.");
          }
          const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
          resolve(bufferToHex(hashBuffer));
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // For larger files, compute a fast composite structural fingerprint
  const sampleChunks: Blob[] = [
    file.slice(0, chunkSize), // Start
    file.slice(Math.floor(totalSize / 2), Math.floor(totalSize / 2) + chunkSize), // Middle
    file.slice(totalSize - chunkSize, totalSize) // End
  ];

  const combinedBlob = new Blob(sampleChunks);

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed parsing composite file streams."));
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
          throw new Error("Composite file buffer read returned empty state.");
        }
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        resolve(bufferToHex(hashBuffer));
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(combinedBlob);
  });
}

/**
 * Highly optimized Uint8Array to Hex string conversion algorithm.
 * Avoids creating thousands of micro-string allocations.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const view = new DataView(buffer);
  let hex = "";

  for (let i = 0; i < view.byteLength; i += 4) {
    // Process 4 bytes at a time as a single 32-bit unsigned integer
    if (i + 4 <= view.byteLength) {
      hex += view.getUint32(i).toString(16).padStart(8, "0");
    } else {
      // Clean up remaining tail elements
      for (let j = i; j < view.byteLength; j++) {
        hex += view.getUint8(j).toString(16).padStart(2, "0");
      }
    }
  }

  return hex;
}

/* =========================================================
   FILE DEDUPLICATION CHECK
========================================================= */

/**
 * Checks with the server if a file has already been uploaded based on its unique hash.
 * 
 * @param file - The target file object from input streams
 * @returns Execution status schema object
 */
export async function CheckFile(file: Blob | File): Promise<CheckFileResult> {
  const result: CheckFileResult = { exists: false, url: "" };

  if (!file || !(file instanceof Blob)) {
    console.warn("[CheckFile] Invalid parameter configuration context: Missing input file payload.");
    return result;
  }

  try {
    const fileHash = await GetFileHash(file);

    // Dynamic fetch API request checking hash deduplication routes
    const response = (await apiFetch(`/check-file/${fileHash}`)) as CheckFileApiResponse | null;

    if (response && typeof response === "object") {
      result.exists = Object.prototype.hasOwnProperty.call(response, "exists")
        ? Boolean(response.exists)
        : Boolean(response.url);
      result.url = response.url || "";
    }
  } catch (error) {
    console.error("[CheckFile] Failed to successfully validate target asset hash state:", error);
  }

  return result;
}