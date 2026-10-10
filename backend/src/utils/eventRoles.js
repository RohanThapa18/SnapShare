export const isPrimaryOrganizer = (event, userId) =>
  event.organizerId.toString() === String(userId);

export const isEventOrganizer = (event, userId) =>
  isPrimaryOrganizer(event, userId) ||
  (event.coOrganizerIds || []).some((id) => id.toString() === String(userId));