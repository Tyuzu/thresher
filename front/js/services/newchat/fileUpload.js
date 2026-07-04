import { apiFetch } from "../../api/api.js";
import { uploadFiles } from "../media/api/mediaApi.js";

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

export function setupFileUpload(
  fileInput,
  uploadButton,
  dropZone,
  chatid,
  progressBar
) {
  const MAX_FILES = 20;
  const MAX_FILE_SIZE =
    10 * 1024 * 1024;

  let uploading = false;

  function validateFile(file) {
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(
        file.name
      );

    return (
      isImage &&
      file.size <= MAX_FILE_SIZE
    );
  }

  function setUploading(state) {
    uploading = state;

    uploadButton.disabled = state;
    fileInput.disabled = state;

    progressBar.style.display = state
      ? "block"
      : "none";

    if (!state) {
      progressBar.value = 0;
    }
  }

  async function processFiles(files) {
    if (uploading) {
      return;
    }

    const validFiles =
      files.filter(validateFile);

    const rejectedCount =
      files.length -
      validFiles.length;

    if (
      validFiles.length === 0
    ) {
      alert(
        "No valid image files selected."
      );
      return;
    }

    if (rejectedCount > 0) {
      alert(
        `${rejectedCount} file(s) were skipped.`
      );
    }

    setUploading(true);

    try {
      const uploadedFiles =
        await uploadFiles(
          validFiles,
          {
            entityType: "chat",
            entityId: String(
              chatid
            ),
            concurrency: 3,
            retry: 1,
            key: getUploadKey
          }
        );

      const successfulUploads =
        uploadedFiles.filter(
          file =>
            file &&
            !file.error
        );

      if (
        successfulUploads.length === 0
      ) {
        throw new Error(
          "No files uploaded."
        );
      }

      await apiFetch(
        "/newchat/upload",
        "POST",
        {
          chat: chatid,
          files:
            successfulUploads
        },
        { json: true }
      );

      fileInput.value = "";
    } catch (err) {
      console.error(
        "Chat upload failed",
        err
      );

      alert(
        err?.message ||
          "Upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  function getSelectedFiles() {
    const files = Array.from(
      fileInput.files || []
    );

    if (
      files.length > MAX_FILES
    ) {
      alert(
        `Maximum ${MAX_FILES} files allowed.`
      );

      return null;
    }

    return files;
  }

  uploadButton.addEventListener(
    "click",
    () => {
      const files =
        getSelectedFiles();

      if (!files) {
        return;
      }

      processFiles(files);
    }
  );

  dropZone.addEventListener(
    "dragenter",
    e => {
      e.preventDefault();
      dropZone.classList.add(
        "drag-over"
      );
    }
  );

  dropZone.addEventListener(
    "dragover",
    e => {
      e.preventDefault();
    }
  );

  dropZone.addEventListener(
    "dragleave",
    () => {
      dropZone.classList.remove(
        "drag-over"
      );
    }
  );

  dropZone.addEventListener(
    "drop",
    e => {
      e.preventDefault();

      dropZone.classList.remove(
        "drag-over"
      );

      const files =
        Array.from(
          e.dataTransfer
            ?.files || []
        );

      if (
        files.length >
        MAX_FILES
      ) {
        alert(
          `Maximum ${MAX_FILES} files allowed.`
        );
        return;
      }

      processFiles(files);
    }
  );
}