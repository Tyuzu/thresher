import { apiFetch } from "../../api/apiClient";
import { uploadFiles } from "../media/api/mediaApi.js";

export function setupFileUpload(
  fileInput,
  uploadButton,
  dropZone,
  chatid,
  progressBar
) {
  const MAX_FILES = 20;

  const validateFile = file =>
    file.type.startsWith("image/") &&
    file.size <= 10 * 1024 * 1024;

  async function processFiles(files) {
    const validFiles = files.filter(validateFile);

    if (validFiles.length === 0) {
      return;
    }

    progressBar.style.display = "block";

    try {
      const uploadedFiles = await uploadFiles(validFiles, {
        entityType: "chat",
        entityId: String(chatid),
        concurrency: 3,
        retry: 1
      });

      const successfulUploads =
        uploadedFiles.filter(
          file => file && !file.error
        );

      if (successfulUploads.length === 0) {
        throw new Error("No files uploaded");
      }

      await apiFetch(
        "/newchat/upload",
        "POST",
        {
          chat: chatid,
          files: successfulUploads
        }
      );

      fileInput.value = "";

    } catch (err) {

      console.error(
        "Chat upload failed",
        err
      );

      alert(
        err?.message ||
        "Upload failed"
      );

    } finally {

      progressBar.style.display = "none";
      progressBar.value = 0;
    }
  }

  uploadButton.addEventListener("click", () => {

    const files = Array.from(
      fileInput.files || []
    );

    if (files.length > MAX_FILES) {
      alert(
        `Maximum ${MAX_FILES} files allowed`
      );
      return;
    }

    processFiles(files);
  });

  dropZone.addEventListener(
    "dragover",
    e => e.preventDefault()
  );

  dropZone.addEventListener(
    "drop",
    e => {

      e.preventDefault();

      const files = Array.from(
        e.dataTransfer.files || []
      );

      if (files.length > MAX_FILES) {
        alert(
          `Maximum ${MAX_FILES} files allowed`
        );
        return;
      }

      processFiles(files);
    }
  );
}