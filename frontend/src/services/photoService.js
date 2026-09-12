import api from "./api";

export const listPhotos = (eventId, params) => api.get(`/events/${eventId}/photos`, { params });

export const uploadOfficialPhotos = (eventId, formData, onProgress) =>
  api.post(`/events/${eventId}/photos/official`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  });

export const uploadCommunityPhotos = (eventId, formData, onProgress) =>
  api.post(`/events/${eventId}/photos/community`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  });

export const deletePhoto = (photoId) => api.delete(`/photos/${photoId}`);
export const updatePhotoMeta = (photoId, payload) => api.put(`/photos/${photoId}`, payload);
export const downloadPhoto = (photoId) => api.get(`/photos/${photoId}/download`);
export const syncPhotosWithCloudinary = (eventId) => api.post(`/events/${eventId}/photos/sync`);

export const likePhoto = (photoId) => api.post(`/photos/${photoId}/like`);
export const unlikePhoto = (photoId) => api.delete(`/photos/${photoId}/like`);
export const favouritePhoto = (photoId) => api.post(`/photos/${photoId}/favourite`);
export const unfavouritePhoto = (photoId) => api.delete(`/photos/${photoId}/favourite`);
export const listMyFavourites = () => api.get("/photos/favourites/mine");

export const findMyPhotos = (eventId, formData) =>
  api.post(`/events/${eventId}/find-my-photos`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
