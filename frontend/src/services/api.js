import axios from "axios";

/**
 * Central Axios instance for all backend API calls. JWT is carried via
 * an httpOnly cookie (see backend auth controller), so withCredentials
 * is required on every request instead of manually attaching a header.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

export default api;
