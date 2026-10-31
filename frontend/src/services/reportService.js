import api from "./api";

export const reportPhoto = (photoId, payload) => api.post(`/photos/${photoId}/report`, payload);
export const listReports = (eventId) => api.get(`/events/${eventId}/reports`);
export const resolveReports = (eventId, photoId, action) =>
  api.post(`/events/${eventId}/reports/photos/${photoId}/resolve`, { action });