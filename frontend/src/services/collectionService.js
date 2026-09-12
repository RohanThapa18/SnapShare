import api from "./api";

/** The current user's persisted Find My Photos results for this event. */
export const getMyPhotosCollection = (eventId) => api.get(`/events/${eventId}/my-photos`);

/**
 * Downloads every authorized matched photo as a ZIP. Fetched as a blob
 * (rather than a plain <a href>) because the endpoint requires the
 * user's auth cookie on a cross-origin request — axios's withCredentials
 * handles that for an XHR/fetch, which a bare top-level navigation
 * can't reliably guarantee across environments. onProgress reports
 * bytes received so the UI can show real download progress.
 */
export const downloadMyPhotosZip = (eventId, onProgress) =>
  api.get(`/events/${eventId}/my-photos/download-all`, {
    responseType: "blob",
    onDownloadProgress: onProgress,
  });
