import api from "./api";

// One unified dashboard endpoint — see backend dashboard.controller.js.
// Returns organizing/photographing/participating stats for whichever
// relationships the current user actually has.
export const getMyDashboard = () => api.get("/dashboard");
