import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8086/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("mess_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("mess_token");
      localStorage.removeItem("mess_user");
      // Don't auto-redirect if already on login/register/landing
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register") && window.location.pathname !== "/") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
