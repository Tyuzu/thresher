import { apiFetch } from "../../../api/api.js";
import { FILEDROP_URL, state } from "../../../state/state.js";
import { UploadStore } from "../store/uploadStore.js";

/* -------------------------
   API - Service endpoint factory
------------------------- */

export function createMediaApi(service = "media") {
  return {
    async fetchMedia(entityType, entityId) {
      return await apiFetch(`/${service}/${entityType}/${entityId}`);
    },

    async deleteMedia(mediaId, entityType, entityId) {
      return await apiFetch(
        `/${service}/${entityType}/${entityId}/${mediaId}`,
        "DELETE"
      );
    },

    async postMedia(entityType, entityId, payload) {
      return await apiFetch(
        `/${service}/${entityType}/${entityId}`,
        "POST",
        payload,
        { json: true }
      );
    }
  };
}

const defaultApi = createMediaApi("media");

export const fetchMedia = defaultApi.fetchMedia.bind(defaultApi);
export const deleteMedia = defaultApi.deleteMedia.bind(defaultApi);
export const postMedia = defaultApi.postMedia.bind(defaultApi);

/* -------------------------
   FileDrop Upload (single)
------------------------- */

export function uploadFile(u) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    UploadStore.controllers[u.id] = xhr;

    const formData = new FormData();

    const key = (u.key || "file").toLowerCase();

    formData.append(key, u.file);
    formData.append("entityType", u.entityType);
    formData.append("entityId", u.entityId || "");

    UploadStore.update(u.id, {
      status: "uploading",
      progress: 0
    });

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        UploadStore.update(u.id, {
          progress: Math.round(
            (e.loaded / e.total) * 100
          )
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

          resolve(
            Array.isArray(data)
              ? data[0]
              : data
          );
        } catch {
          UploadStore.update(u.id, {
            status: "error"
          });

          reject(
            new Error(
              "Invalid FILEDROP response"
            )
          );
        }

        return;
      }

      UploadStore.update(u.id, {
        status: "error"
      });

      const error = new Error(
        xhr.responseText ||
        xhr.statusText ||
        "Upload failed"
      );

      error.status = xhr.status;

      reject(error);
    };

    xhr.onerror = () => {
      UploadStore.update(u.id, {
        status: "error"
      });

      reject(new Error("Network error"));
    };

    xhr.onabort = () => {
      UploadStore.update(u.id, {
        status: "canceled"
      });

      reject(new Error("Upload canceled"));
    };

    xhr.open("POST", FILEDROP_URL);

    const token = state?.token;

    if (token) {
      xhr.setRequestHeader(
        "Authorization",
        `Bearer ${token}`
      );
    }

    xhr.send(formData);
  });
}

/* -------------------------
   Concurrency Queue
------------------------- */

async function runUploadQueue(
  items,
  worker,
  concurrency = 3
) {
  const results = new Array(items.length);

  let index = 0;

  async function next() {
    if (index >= items.length) {
      return;
    }

    const currentIndex = index++;
    const item = items[currentIndex];

    try {
      results[currentIndex] =
        await worker(item);
    } catch (err) {
      results[currentIndex] = {
        error: err.message || String(err)
      };
    }

    return next();
  }

  const workers = Array.from(
    { length: concurrency },
    () => next()
  );

  await Promise.all(workers);

  return results;
}

/* -------------------------
   Retry Wrapper
------------------------- */

async function uploadWithRetry(
  item,
  retries = 2
) {
  try {
    return await uploadFile(item);
  } catch (err) {

    if (
      err.status === 401 ||
      err.status === 403
    ) {
      throw err;
    }

    if (retries > 0) {
      return uploadWithRetry(
        item,
        retries - 1
      );
    }

    throw err;
  }
}

/* -------------------------
   Upload Multiple Files
------------------------- */

export async function uploadFiles(
  files,
  options = {}
) {
  const {
    entityType = "media",
    entityId = "",
    concurrency = 3,
    retry = 0,
    key
  } = options;

  const items = Array.from(files).map(
    file => {
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
        key:
          typeof key === "function"
            ? key(file)
            : key || "file"
      };
    }
  );

  const worker =
    retry > 0
      ? item =>
          uploadWithRetry(item, retry)
      : item => uploadFile(item);

  return runUploadQueue(
    items,
    worker,
    concurrency
  );
}

/* -------------------------
   Cancel Helpers
------------------------- */

export function cancelUpload(id) {
  const xhr = UploadStore.controllers[id];

  if (xhr) {
    xhr.abort();
  }
}

export function cancelAllUploads() {
  Object.values(
    UploadStore.controllers
  ).forEach(xhr => xhr.abort());
}