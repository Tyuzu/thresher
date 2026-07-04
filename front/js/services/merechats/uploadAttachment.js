import { MERE_URL, getState } from "../../state/state.js";
import { uploadFile } from "../media/api/mediaApi.js";
import { uid } from "../media/ui/mediaUploadForm.js";
import {
  pendingMap,
  mountMessage,
  reconcilePending
} from "./chatSocket.js";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm"
];

const MAX_RETRIES = 3;

function isValidFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    );
  }
}

function getUploadKey(file) {
  if (file.type.startsWith("image/")) {
    return "photo";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "file";
}

function createOptimisticMessage(file, mediaId, clientId) {
  const previewUrl = URL.createObjectURL(file);

  return {
    previewUrl,

    message: {
      messageid: clientId,
      sender: getState("user"),
      createdAt: new Date().toISOString(),

      media: {
        mediaId,
        url: previewUrl,
        mimeType: file.type,
        type: file.type.startsWith("video")
          ? "video"
          : "image"
      }
    }
  };
}

async function retry(fn, retries = MAX_RETRIES) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (i < retries - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, 1000 * (i + 1))
        );
      }
    }
  }

  throw lastError;
}

async function sendMediaMessage(
  chatid,
  mediaId,
  upload,
  file
) {
  const form = new FormData();

  form.append("mediaid", mediaId);
  form.append("savedname", upload.filename);
  form.append("extn", upload.extension);
  form.append("mimeType", extToMime(upload.extension));
  form.append("fileSize", String(file.size));

  const response = await fetch(
    `${MERE_URL}/merechats/chat/${encodeURIComponent(chatid)}/upload`,
    {
      method: "POST",
      body: form,
      headers: {
        Authorization:
          `Bearer ${getState("token") || ""}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

function reconcilePreview(serverMessage, previewUrl) {
  if (!serverMessage?.media) {
    return serverMessage;
  }

  serverMessage.media.serverUrl =
    serverMessage.media.url;

  serverMessage.media.previewUrl =
    previewUrl;

  serverMessage.media.__local_preview = true;

  return serverMessage;
}

async function uploadSingleFile(
  chatid,
  file
) {
  isValidFile(file);

  const mediaId = uid();
  const clientId = `f_${mediaId}`;

  const {
    previewUrl,
    message
  } = createOptimisticMessage(
    file,
    mediaId,
    clientId
  );

  const el = mountMessage(message);

  pendingMap.set(clientId, {
    chatid,
    el,
    previewUrl,
    progress: 0
  });

  try {
    const upload = await retry(() =>
      uploadFile({
        id: mediaId,
        file,
        key: getUploadKey(file),
        entityType: "chat",
        entityId: String(chatid),

        onProgress(percent) {
          const pending =
            pendingMap.get(clientId);

          if (!pending) {
            return;
          }

          pending.progress = percent;

          if (pending.el?.dataset) {
            pending.el.dataset.progress =
              String(percent);
          }
        }
      })
    );

    if (
      !upload?.filename ||
      !upload?.extension
    ) {
      throw new Error(
        "Upload response invalid"
      );
    }

    const msg = await retry(() =>
      sendMediaMessage(
        chatid,
        mediaId,
        upload,
        file
      )
    );

    reconcilePending(
      chatid,
      clientId,
      reconcilePreview(
        msg,
        previewUrl
      )
    );

    pendingMap.delete(clientId);

    URL.revokeObjectURL(previewUrl);
  } catch (error) {
    console.error(
      "File upload failed",
      error
    );

    const pending =
      pendingMap.get(clientId);

    if (pending?.el) {
      pending.el.remove();
    }

    pendingMap.delete(clientId);

    URL.revokeObjectURL(
      previewUrl
    );

    throw error;
  }
}

export async function uploadAttachment(
  chatid,
  fileInput
) {
  const files = Array.from(
    fileInput.files || []
  );

  if (!files.length) {
    return;
  }

  try {
    const results =
      await Promise.allSettled(
        files.map(file =>
          uploadSingleFile(
            chatid,
            file
          )
        )
      );

    const failed = results.filter(
      result =>
        result.status === "rejected"
    );

    if (failed.length) {
      console.error(
        "Some uploads failed:",
        failed
      );
    }
  } finally {
    fileInput.value = "";
  }
}

function extToMime(ext) {
  if (!ext) {
    return "application/octet-stream";
  }

  const normalized =
    ext.startsWith(".")
      ? ext.toLowerCase()
      : `.${ext.toLowerCase()}`;

  return {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime"
  }[normalized] || "application/octet-stream";
}