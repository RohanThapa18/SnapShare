import api from "./api";

// Create event
export const createEvent = (payload) =>
  api.post("/events", payload);

// Get event by MongoDB ID
export const getEvent = (id) =>
  api.get(`/events/${id}`);

// Get event by public slug
export const getEventBySlug = (slug) =>
  api.get(`/events/slug/${slug}`);

// List events created/joined by current user
export const listMyEvents = () =>
  api.get("/events/mine");

// Update event
export const updateEvent = (id, payload) =>
  api.put(`/events/${id}`, payload);

// Delete event
export const deleteEvent = (id) =>
  api.delete(`/events/${id}`);

// Join event
export const joinEvent = (id, payload) =>
  api.post(`/events/${id}/join`, payload);

// Join as photographer
export const joinEventAsPhotographer = (
  id,
  photographerToken
) =>
  api.post(`/events/${id}/join-as-photographer`, {
    photographerToken,
  });

// Leave event
export const leaveEvent = (id) =>
  api.post(`/events/${id}/leave`);

// Participants
export const getParticipants = (id, params) =>
  api.get(`/events/${id}/participants`, { params });

export const removeParticipant = (id, userId) =>
  api.delete(`/events/${id}/participants/${userId}`);

// QR codes
export const getJoinQr = (id) =>
  api.get(`/events/${id}/join-qr`);

export const getPhotographerJoinQr = (id) =>
  api.get(`/events/${id}/photographer-join-qr`);

// Event statistics
export const getEventStats = (id) =>
  api.get(`/events/${id}/stats`);

// Organizer-only passcode
export const getEventPasscode = (id) =>
  api.get(`/events/${id}/passcode`);

export const regeneratePasscode = (id) =>
  api.post(`/events/${id}/passcode/regenerate`);

// Photographers
export const addPhotographer = (id, email) =>
  api.post(`/events/${id}/photographers`, { email });

export const listPhotographers = (id) =>
  api.get(`/events/${id}/photographers`);

export const removePhotographer = (id, userId) =>
  api.delete(`/events/${id}/photographers/${userId}`);

export const setPhotographerPermission = (
  id,
  userId,
  canUpload
) =>
  api.put(
    `/events/${id}/photographers/${userId}/permission`,
    { canUpload }
  );