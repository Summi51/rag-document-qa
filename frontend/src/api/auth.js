import { apiRequest } from "./client.js";

export const login = (email, password) =>
  apiRequest("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });

export const signup = (email, password, name) =>
  apiRequest("/api/auth/signup", {
    method: "POST",
    body: { email, password, name },
  });

export const getCurrentUser = (token) =>
  apiRequest("/api/auth/me", { token });
