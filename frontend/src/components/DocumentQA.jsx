import { useState } from "react";
import { AuthError } from "../api/client.js";
import { deleteDocument, searchDocument } from "../api/documents.js";
import { SendIcon, SpinnerIcon } from "./Icons.jsx";
import StatusBadge from "./StatusBadge.jsx";

function DocumentQA({
  token,
  documents,
  selectedDocumentId,
  onSelectDocument,
  onDeleted,
  onAnswer,
  onAuthError,
}) {
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");

  const handleAskQuestion = async (event) => {
    event?.preventDefault();
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setStatus("Please enter a question.");
      setStatusType("error");
      return;
    }

    if (!selectedDocumentId) {
      setStatus("Please select a document first.");
      setStatusType("error");
      return;
    }

    try {
      setIsAsking(true);
      onAnswer("", []);
      setStatus("Searching document...");
      setStatusType("loading");

      const data = await searchDocument(token, trimmedQuestion, selectedDocumentId);
      onAnswer(data.answer, data.sources || []);
      setStatus("");
    } catch (error) {
      if (error instanceof AuthError) {
        onAuthError();
        setStatus("Session expired. Please sign in again.");
      } else {
        onAnswer(error.message || "Failed to get an answer", []);
        setStatus(error.message || "Failed to get an answer");
      }
      setStatusType("error");
    } finally {
      setIsAsking(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocumentId) {
      setStatus("Please select a document first.");
      setStatusType("error");
      return;
    }

    const selectedDocument = documents.find(
      (document) => document.documentId === selectedDocumentId
    );
    const fileName = selectedDocument?.fileName || "this document";

    if (!window.confirm(`Delete "${fileName}" and all of its chunks? This cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      setStatus("Deleting document...");
      setStatusType("loading");

      const data = await deleteDocument(token, selectedDocumentId);
      onDeleted();
      setStatus(data.message || "Document and associated chunks deleted");
      setStatusType("success");
    } catch (error) {
      if (error instanceof AuthError) {
        onAuthError();
        setStatus("Session expired. Please sign in again.");
      } else {
        setStatus(error.message || "Failed to delete document");
      }
      setStatusType("error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="card-glass rounded-2xl p-6 mb-5 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center gap-3 mb-5">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-xs font-bold text-white shrink-0">2</span>
        <h2 className="text-xl font-semibold text-slate-100">Ask a Question</h2>
      </div>

      <label htmlFor="document-select" className="text-sm font-medium text-slate-300">
        Select Document:
      </label>

      <div className="flex items-stretch gap-2 mt-2 mb-4">
        <select
          id="document-select"
          value={selectedDocumentId}
          onChange={(event) => onSelectDocument(event.target.value)}
          className="input-field w-full rounded-xl px-4 py-3 text-sm"
        >
          <option value="">Select a document</option>
          {documents.map((document) => (
            <option key={document.documentId} value={document.documentId}>
              {document.fileName}
            </option>
          ))}
        </select>

        <button
          id="delete-document-btn"
          type="button"
          onClick={handleDeleteDocument}
          disabled={isDeleting || !selectedDocumentId}
          className="px-4 py-3 rounded-xl text-sm font-semibold shrink-0 border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      <form onSubmit={handleAskQuestion}>
        <textarea
          id="question-input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleAskQuestion(event);
            }
          }}
          placeholder="e.g. What is this document about? Summarize the key points."
          rows={4}
          className="input-field w-full rounded-xl px-4 py-3 text-sm resize-none leading-relaxed"
        />

        <button
          id="ask-btn"
          type="submit"
          disabled={isAsking || !selectedDocumentId || !question.trim()}
          className="btn-primary w-full mt-4 py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm relative z-10"
        >
          {isAsking ? (
            <><SpinnerIcon /><span>Thinking…</span></>
          ) : (
            <><SendIcon /><span>Ask Question</span></>
          )}
        </button>
      </form>

      {status && <StatusBadge message={status} type={statusType} />}
    </div>
  );
}

export default DocumentQA;
