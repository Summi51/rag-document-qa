import { useState, useRef, useEffect } from "react";
import "./App.css";

const LOCAL_API_URL = "http://localhost:8000";
const DEPLOYED_API_URL = "https://rag-document-qa-one.vercel.app";

const isLocalFrontend =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const API_URL = isLocalFrontend
  ? LOCAL_API_URL
  : import.meta.env.VITE_API_URL || DEPLOYED_API_URL;

// const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
// const API_URL = import.meta.env.VITE_API_URL || "https://rag-document-qa-one.vercel.app";

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

/* ── Icons (inline SVGs to avoid extra deps) ── */
const UploadIcon = () => (
  <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0-3 3m3-3 3 3M4.5 19.5h15a1.5 1.5 0 0 0 1.5-1.5v-9a1.5 1.5 0 0 0-1.5-1.5H4.5A1.5 1.5 0 0 0 3 9v9a1.5 1.5 0 0 0 1.5 1.5Z" />
  </svg>
);

const PDFIcon = () => (
  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm-1 1.5L18.5 9H13V3.5ZM8.5 15.5h-1V13H6v4h1.5v-1.5H8v1.5H9.5v-1.5c0-.8-.7-1-1-1Zm3.5 0h-1V13h1c.6 0 1 .5 1 1.25S12.6 15.5 12 15.5Zm5 0h-2.5V13H16v.75h-1.5v.75H16v.75h-1.5v.25H16v.75Z"/>
  </svg>
);

const BrainIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin-slow" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const BookIcon = () => (
  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

/* ── Status Badge ── */
function StatusBadge({ message, type = "info" }) {
  const colors = {
    info:    "bg-blue-500/10 border-blue-500/30 text-blue-300",
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    error:   "bg-red-500/10 border-red-500/30 text-red-300",
    loading: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300",
  };
  return (
    <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${colors[type]}`}>
      {type === "loading" && <SpinnerIcon />}
      {type === "success" && <CheckIcon />}
      <span>{message}</span>
    </div>
  );
}

/* ── Main App ── */
function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadStatusType, setUploadStatusType] = useState("info");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [questionStatus, setQuestionStatus] = useState("");
  const [questionStatusType, setQuestionStatusType] = useState("info");

  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");

  const fileInputRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/documents`);
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch documents");
      }

      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Documents fetch error:", error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadStatus("Please select a valid PDF file.");
      setUploadStatusType("error");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setUploadStatus("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus("Please select a PDF first.");
      setUploadStatusType("error");
      return;
    }
    try {
      setIsUploading(true);
      setUploadStatus("Uploading and processing PDF...");
      setUploadStatusType("loading");

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await readJson(response);

      if (!response.ok) throw new Error(data.message || "Upload failed");

      setUploadStatus(`PDF processed successfully — ${data.chunkCount} chunks created.`);
      setUploadStatusType("success");
      setSelectedDocumentId(data.documentId);
      fetchDocuments();
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus(error.message || "Failed to upload PDF.");
      setUploadStatusType("error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAskQuestion = async (event) => {
    event?.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setQuestionStatus("Please enter a question.");
      setQuestionStatusType("error");
      return;
    }
    if (!selectedDocumentId) {
      setQuestionStatus("Please select a document first.");
      setQuestionStatusType("error");
      return;
    }
    try {
      setIsAsking(true);
      setAnswer("");
      setSources([]);
      setQuestionStatus("Searching document...");
      setQuestionStatusType("loading");

      const response = await fetch(`${API_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmedQuestion,
          documentId: selectedDocumentId,
        }),
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to get an answer");
      }

      setAnswer(data.answer);
      setSources(data.sources || []);
      setQuestionStatus("");
    } catch (error) {
      console.error("Question error:", error);

      setAnswer(error.message || "Failed to get an answer");
      setSources([]);
      setQuestionStatus(error.message || "Failed to get an answer");
      setQuestionStatusType("error");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050d1f] bg-grid text-slate-200 font-sans">

      {/* ── Background Orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-violet-600/8 blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">

        {/* ── Header ── */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 mb-6 shadow-lg shadow-blue-900/40 animate-pulse-glow">
            <BrainIcon />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-3 tracking-tight">
            RAG Document Q&amp;A
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
            Upload a PDF and get AI-powered answers from your document using vector embeddings.
          </p>

          {/* Pipeline tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            {["EDA", "Embedding", "Vector Store", "Agent", "LLM"].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 border border-blue-500/25 text-blue-300">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* ── Step 1: Upload ── */}
        <div className="card-glass rounded-2xl p-6 mb-5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3 mb-5">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-xs font-bold text-white shrink-0">1</span>
            <h2 className="text-xl font-semibold text-slate-100">Upload Document</h2>
          </div>

          {/* Drop Zone */}
          <div
            className={`upload-zone rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging ? "border-blue-400 bg-blue-500/10" : ""
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            id="upload-drop-zone"
          >
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => handleFileChange(e.target.files[0])}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <UploadIcon />
              {selectedFile ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <PDFIcon />
                  <span className="text-sm font-medium text-blue-300">{selectedFile.name}</span>
                </div>
              ) : (
                <>
                  <p className="text-slate-300 font-medium">Drop your PDF here or <span className="text-blue-400 underline underline-offset-2">browse</span></p>
                  <p className="text-slate-500 text-sm">Only PDF files are supported</p>
                </>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <button
            id="upload-btn"
            onClick={handleUpload}
            disabled={isUploading || !selectedFile}
            className="btn-primary w-full mt-4 py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm relative z-10"
          >
            {isUploading ? (
              <><SpinnerIcon /><span>Processing…</span></>
            ) : (
              <><span>Upload &amp; Process PDF</span></>
            )}
          </button>

          {uploadStatus && <StatusBadge message={uploadStatus} type={uploadStatusType} />}
        </div>

        {/* ── Step 2: Ask ── */}
        <div className="card-glass rounded-2xl p-6 mb-5 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-3 mb-5">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-xs font-bold text-white shrink-0">2</span>
            <h2 className="text-xl font-semibold text-slate-100">Ask a Question</h2>
          </div>

          <label htmlFor="document-select" className="text-sm font-medium text-slate-300">
            Select Document:
          </label>

          <select
            id="document-select"
            value={selectedDocumentId}
            onChange={(event) => setSelectedDocumentId(event.target.value)}
            className="input-field w-full rounded-xl px-4 py-3 text-sm mt-2 mb-4"
          >
            <option value="">Select a document</option>

            {documents.map((document) => (
              <option key={document.documentId} value={document.documentId}>
                {document.fileName}
              </option>
            ))}
          </select>

          <form onSubmit={handleAskQuestion}>
            <textarea
              id="question-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAskQuestion(e);
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

          {questionStatus && <StatusBadge message={questionStatus} type={questionStatusType} />}
        </div>

        {/* ── Answer ── */}
        {answer && (
          <div className="card-glass rounded-2xl p-6 mb-5 animate-fade-in-up border-indigo-500/30" style={{ animationDelay: "0s" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shrink-0">
                <BrainIcon />
              </div>
              <h2 className="text-xl font-semibold text-slate-100">AI Answer</h2>
            </div>
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap bg-black/20 rounded-xl p-4 border border-indigo-500/10">
              {answer}
            </div>
          </div>
        )}

        {/* ── Sources ── */}
        {sources.length > 0 && (
          <div className="card-glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
            <div className="flex items-center gap-3 mb-5">
              <BookIcon />
              <h2 className="text-xl font-semibold text-slate-100">Retrieved Sources</h2>
              <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/25 text-blue-300">
                {sources.length} chunk{sources.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {sources.map((source, index) => {
                const score = source.score ?? 0;
                const pct = Math.min(100, Math.round(score * 100));
                return (
                  <div
                    key={source._id || `${source.documentName}-${source.chunkIndex}-${index}`}
                    className="source-chip rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600/20 text-blue-300 border border-blue-600/30">
                          Chunk {source.chunkIndex + 1}
                        </span>
                        <span className="text-xs text-slate-400 font-medium truncate max-w-xs">
                          {source.documentName}
                        </span>
                        {source.pageNumber !== undefined && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-600/20 text-indigo-300 border border-indigo-600/30">
                            📍 Page {source.pageNumber}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-indigo-300 shrink-0">
                        {pct}% match
                      </span>
                    </div>

                    {/* Score bar */}
                    <div className="h-1 w-full bg-slate-800 rounded mb-3">
                      <div className="score-bar" style={{ width: `${pct}%` }} />
                    </div>

                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-4">
                      {source.chunkText}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <p className="text-center text-slate-600 text-xs mt-10">
          Powered by RAG · Vector Embeddings · LLM
        </p>
      </div>
    </div>
  );
}

export default App;