# RAG Document Q&A

Upload a PDF, then ask questions. The app retrieves relevant chunks from your document and answers with Gemini — not from general knowledge.

**Frontend:** [rag-document-qa-ff68.vercel.app](https://rag-document-qa-ff68.vercel.app/)
**Backend:** [rag-document-qa-one.vercel.app](https://rag-document-qa-one.vercel.app/)

## How it works

```
PDF
 ↓
Text Extraction
 ↓
Chunking
 ↓
Embeddings (Gemini)
 ↓
MongoDB Atlas Vector Search
 ↓
User Question → Question Embedding
 ↓
Relevant Chunks → RAG Prompt → Gemini
 ↓
Final Answer + Sources
```

1. PDF text is extracted, split into overlapping chunks, and stored with embeddings in MongoDB.
2. A question is embedded the same way.
3. `$vectorSearch` finds the closest chunks.
4. Gemini answers using only that context.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Express, Multer, pdfjs-dist |
| AI | Google Gemini (`@google/genai`) |
| Database | MongoDB Atlas Vector Search |
| Deploy | Vercel (frontend + serverless backend) |

## Project structure

```
rag-document-qa/
├── backend/
│   ├── index.js              # Express app (local + Vercel)
│   ├── config/               # MongoDB, Gemini, PDF extract
│   ├── models/DocumentChunk.js
│   ├── routes/               # /api/upload, /api/search
│   └── vercel.json
└── frontend/
    └── src/App.jsx           # Upload + Q&A UI
```

## Local setup

You need **two terminals**, Node.js 20+, MongoDB Atlas (vector index `vector_index`), and a Gemini API key.

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/ragdoc
GEMINI_API_KEY=your_gemini_api_key
PORT=8000
```

```bash
npm run dev
```

Backend: [http://localhost:8000](http://localhost:8000)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: [http://localhost:5173](http://localhost:5173) (or 5174 if 5173 is busy)

Local frontend talks to `http://localhost:8000`. Deployed frontend talks to the Vercel backend. Localhost URL is kept in code as a comment.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/upload` | Upload PDF (`multipart/form-data`, field `file`) |
| `POST` | `/api/search` | Ask a question `{ "question": "..." }` |

## MongoDB Atlas

Create a vector search index named **`vector_index`** on collection `documentchunks`:

- Path: `embedding`
- Similarity: cosine
- Dimensions: match Gemini embedding model (`gemini-embedding-2`)

Network Access must allow `0.0.0.0/0` for Vercel.

## Vercel deploy

This repo is **two Vercel projects** (root directories `backend` and `frontend`).

### Backend project

Root Directory: `backend`

Environment variables:

| Name | Required |
|---|---|
| `MONGODB_URI` | Yes |
| `GEMINI_API_KEY` | Yes |

Do **not** set `PORT`. Vercel assigns its own.

### Frontend project

Root Directory: `frontend`

Environment variable (optional, but recommended):

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://rag-document-qa-one.vercel.app` |

Vite bakes `VITE_*` vars at **build time**. After adding/changing it, **Redeploy**.

If `VITE_API_URL` is missing, the UI still uses the hardcoded backend URL on Vercel and localhost on your machine.

## Scripts

**Backend**

```bash
npm run dev    # nodemon index.js
```

**Frontend**

```bash
npm run dev    # vite
npm run build  # production build
```
