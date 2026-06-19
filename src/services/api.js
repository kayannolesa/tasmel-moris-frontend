const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export function getApiBaseUrl() {
  return API_BASE_URL;
}
