const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

let accessToken = sessionStorage.getItem("moris_access_token") || "";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || "";
  if (accessToken) {
    sessionStorage.setItem("moris_access_token", accessToken);
    return;
  }

  sessionStorage.removeItem("moris_access_token");
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return { ok: response.ok, message: await response.text() };
}

async function refreshAccessToken() {
  const payload = await apiRequest("/api/auth/refresh", {
    method: "POST",
    auth: false,
    retry: false,
  });

  setAccessToken(payload.accessToken);
  return payload;
}

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) {
    throw new ApiError("The API base URL is not configured.", 0, null);
  }

  const { body, auth = true, retry = true, headers = {}, ...fetchOptions } = options;
  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth && accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...fetchOptions,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await parseResponse(response);

  if (response.status === 401 && retry && auth) {
    try {
      await refreshAccessToken();
      return apiRequest(path, { ...options, retry: false });
    } catch (error) {
      setAccessToken("");
    }
  }

  if (!response.ok) {
    throw new ApiError(payload.message || "Request failed.", response.status, payload);
  }

  return payload;
}

export async function downloadBlob(path, options = {}) {
  if (!API_BASE_URL) {
    throw new ApiError("The API base URL is not configured.", 0, null);
  }

  const { auth = true, headers = {}, ...fetchOptions } = options;
  const requestHeaders = {
    Accept: "*/*",
    ...headers,
  };

  if (auth && accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...fetchOptions,
    headers: requestHeaders,
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw new ApiError(payload?.message || "Download failed.", response.status, payload);
  }

  return {
    blob: await response.blob(),
    fileName: response.headers.get("content-disposition")?.match(/filename=\"?([^\";]+)\"?/)?.[1] || "download.bin",
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}
