import { getOptimizedUrl, getThumbnailUrl, getWatermarkedUrl } from "./cloudinaryService.js";

export const presentPhoto = (photo, { purchased = false } = {}) => {
  const raw = typeof photo.toObject === "function" ? photo.toObject() : photo;
  const { cloudinaryPublicId, ...rest } = raw;
  const type = raw.deliveryType || "upload";
  const locked = Boolean(raw.isPaid) && !purchased;

  return {
    ...rest,
    url: locked
      ? getWatermarkedUrl(cloudinaryPublicId, { type })
      : getOptimizedUrl(cloudinaryPublicId, { type }),
    thumbnailUrl: locked
      ? getWatermarkedUrl(cloudinaryPublicId, { width: 600, type })
      : getThumbnailUrl(cloudinaryPublicId, { type }),
    purchased: raw.isPaid ? purchased : true,
  };
};