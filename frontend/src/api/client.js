const LOCAL_API_URL = "http://localhost:8000";
const DEPLOYED_API_URL = "https://rag-document-qa-one.vercel.app";

const isLocalFrontend =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const API_URL = isLocalFrontend
  ? LOCAL_API_URL
  : import.meta.env.VITE_API_URL || DEPLOYED_API_URL;

const TOKEN_STORAGE_KEY = "rag_auth_token";

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthError";
  }
}

export const getStoredToken = () =>
  localStorage.getItem(TOKEN_STORAGE_KEY) || "";

export const storeToken = (token) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    token,
    headers = {},
    body,
    isFormData = false,
  } = options;

  const requestHeaders = { ...headers };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (!isFormData && body && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await readJson(response);

  if (response.status === 401) {
    throw new AuthError(data.message || "Authentication required");
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}
