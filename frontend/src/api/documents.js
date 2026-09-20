import { apiRequest } from "./client.js";

export const listDocuments = (token) =>
  apiRequest("/api/documents", { token });

export const uploadDocument = (token, file) => {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest("/api/upload", {
    method: "POST",
    token,
    body: formData,
    isFormData: true,
  });
};

export const deleteDocument = (token, documentId) =>
  apiRequest(`/api/documents/${documentId}`, {
    method: "DELETE",
    token,
  });

export const searchDocument = (token, question, documentId) =>
  apiRequest("/api/search", {
    method: "POST",
    token,
    body: { question, documentId },
  });
