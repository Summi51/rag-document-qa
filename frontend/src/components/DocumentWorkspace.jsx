import { useEffect, useState } from "react";
import { AuthError } from "../api/client.js";
import { listDocuments } from "../api/documents.js";
import AnswerCard from "./AnswerCard.jsx";
import DocumentQA from "./DocumentQA.jsx";
import DocumentUpload from "./DocumentUpload.jsx";
import SourceList from "./SourceList.jsx";

function DocumentWorkspace({ token, onAuthError }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);

  const fetchDocuments = async () => {
    try {
      const data = await listDocuments(token);
      setDocuments(data.documents || []);
    } catch (error) {
      if (error instanceof AuthError) {
        onAuthError();
      }
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  const handleUploaded = async (documentId) => {
    setSelectedDocumentId(documentId);
    setAnswer("");
    setSources([]);
    await fetchDocuments();
  };

  const handleDeleted = async () => {
    setSelectedDocumentId("");
    setAnswer("");
    setSources([]);
    await fetchDocuments();
  };

  return (
    <>
      <DocumentUpload
        token={token}
        onUploaded={handleUploaded}
        onAuthError={onAuthError}
      />
      <DocumentQA
        token={token}
        documents={documents}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={setSelectedDocumentId}
        onDeleted={handleDeleted}
        onAnswer={(nextAnswer, nextSources) => {
          setAnswer(nextAnswer);
          setSources(nextSources);
        }}
        onAuthError={onAuthError}
      />
      <AnswerCard answer={answer} />
      <SourceList sources={sources} />
    </>
  );
}

export default DocumentWorkspace;
