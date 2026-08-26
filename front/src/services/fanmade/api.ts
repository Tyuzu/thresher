import {
  createMediaApi,
  uploadFile,
  uploadFiles,
  cancelUpload,
  cancelAllUploads,
  type MediaItem
} from "../media/api/mediaApi.js";

const fanmadeApi = createMediaApi("fanmade");

export const fetchMedia = fanmadeApi.fetchMedia.bind(fanmadeApi);
export const deleteMedia = fanmadeApi.deleteMedia.bind(fanmadeApi);
export const postMediaFanmade = fanmadeApi.postMedia.bind(fanmadeApi);

export { uploadFile, uploadFiles, cancelUpload, cancelAllUploads };
export type { MediaItem };
