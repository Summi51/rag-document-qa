import { useRef, useState } from "react";
import { AuthError } from "../api/client.js";
import { uploadDocument } from "../api/documents.js";
import { PDFIcon, SpinnerIcon, UploadIcon } from "./Icons.jsx";
import StatusBadge from "./StatusBadge.jsx";

function DocumentUpload({ token, onUploaded, onAuthError }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");

  const handleFileChange = (file) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setStatus("Please select a valid PDF file.");
      setStatusType("error");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setStatus("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatus("Please select a PDF first.");
      setStatusType("error");
      return;
    }

    try {
      setIsUploading(true);
      setStatus("Uploading and processing PDF...");
      setStatusType("loading");

      const data = await uploadDocument(token, selectedFile);

      setStatus(`PDF processed successfully — ${data.chunkCount} chunks created.`);
      setStatusType("success");
      onUploaded(data.documentId);
    } catch (error) {
      if (error instanceof AuthError) {
        onAuthError();
        setStatus("Session expired. Please sign in again.");
      } else {
        setStatus(error.message || "Failed to upload PDF.");
      }
      setStatusType("error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card-glass rounded-2xl p-6 mb-5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center gap-3 mb-5">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-xs font-bold text-white shrink-0">1</span>
        <h2 className="text-xl font-semibold text-slate-100">Upload Document</h2>
      </div>

      <div
        className={`upload-zone rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging ? "border-blue-400 bg-blue-500/10" : ""
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFileChange(event.dataTransfer.files[0]);
        }}
        id="upload-drop-zone"
      >
        <input
          ref={fileInputRef}
          id="file-input"
          type="file"
          accept=".pdf,application/pdf"
          onChange={(event) => handleFileChange(event.target.files[0])}
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

      <button
        id="upload-btn"
        onClick={handleUpload}
        disabled={isUploading || !selectedFile}
        className="btn-primary w-full mt-4 py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm relative z-10"
      >
        {isUploading ? (
          <><SpinnerIcon /><span>Processing…</span></>
        ) : (
          <span>Upload &amp; Process PDF</span>
        )}
      </button>

      {status && <StatusBadge message={status} type={statusType} />}
    </div>
  );
}

export default DocumentUpload;
