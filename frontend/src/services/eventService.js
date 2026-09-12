import api from "./api";

export const createEvent = (payload) => api.post("/events", payload);
export const getEvent = (id) => api.get(`/events/${id}`);
export const listMyEvents = () => api.get("/events/mine");
export const updateEvent = (id, payload) => api.put(`/events/${id}`, payload);
export const deleteEvent = (id) => api.delete(`/events/${id}`);
export const joinEvent = (id, payload) => api.post(`/events/${id}/join`, payload);
export const joinEventAsPhotographer = (id, photographerToken) =>
  api.post(`/events/${id}/join-as-photographer`, { photographerToken });
export const leaveEvent = (id) => api.post(`/events/${id}/leave`);
export const getParticipants = (id, params) => api.get(`/events/${id}/participants`, { params });
export const removeParticipant = (id, userId) => api.delete(`/events/${id}/participants/${userId}`);
export const getJoinQr = (id) => api.get(`/events/${id}/join-qr`);
export const getPhotographerJoinQr = (id) => api.get(`/events/${id}/photographer-join-qr`);
export const getEventStats = (id) => api.get(`/events/${id}/stats`);

// Organizer-only, backend-enforced — can be called any time the
// organizer owns the event, not just right after creation.
export const getEventPasscode = (id) => api.get(`/events/${id}/passcode`);
export const regeneratePasscode = (id) => api.post(`/events/${id}/passcode/regenerate`);

export const addPhotographer = (id, email) => api.post(`/events/${id}/photographers`, { email });
export const listPhotographers = (id) => api.get(`/events/${id}/photographers`);
export const removePhotographer = (id, userId) => api.delete(`/events/${id}/photographers/${userId}`);
export const setPhotographerPermission = (id, userId, canUpload) =>
  api.put(`/events/${id}/photographers/${userId}/permission`, { canUpload });
