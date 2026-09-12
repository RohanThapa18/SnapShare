/**
 * Triggers a native browser download. Relies on the backend serving
 * Cloudinary URLs with the `fl_attachment` flag (Content-Disposition:
 * attachment), so this works even though the URL is cross-origin —
 * the download` attribute alone wouldn't force it cross-origin, but
 * Cloudinary's response header does.
 */
export const triggerDownload = (url, filename) => {
  const link = document.createElement("a");
  link.href = url;
  if (filename) link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Same idea as triggerDownload, but for a Blob already in memory
 * (e.g. the ZIP returned by the Download All endpoint) rather than a
 * remote URL. Creates a short-lived object URL, clicks it, then
 * revokes it once the browser has had a chance to start the download.
 */
export const triggerBlobDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

/** Pulls a filename out of a Content-Disposition header, if present. */
export const filenameFromContentDisposition = (header, fallback) => {
  if (!header) return fallback;
  const match = header.match(/filename="?([^"]+)"?/i);
  return match ? match[1] : fallback;
};
