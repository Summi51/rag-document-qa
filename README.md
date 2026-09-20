# RAG Document Q&A

Sign in, upload a PDF, then ask questions about **that** document. The app retrieves relevant chunks with MongoDB Atlas Vector Search and answers with Gemini using only that context — not general knowledge.

**Frontend:** [rag-document-qa-ff68.vercel.app](https://rag-document-qa-ff68.vercel.app/)
**Backend:** [rag-document-qa-one.vercel.app](https://rag-document-qa-one.vercel.app/)

## Features

- JWT signup / login / logout, session restore on refresh
- Per-user documents (you cannot list, delete, or search another user's PDF)
- Page-by-page PDF text extraction (`pdfjs-dist`)
- Overlapping chunks tagged with page number
- Concurrent Gemini embeddings (`gemini-embedding-2`, 3072 dims)
- Duplicate PDF block via SHA-256 content hash (per user — rename does not bypass)
- Document Q&A with source chunks + page numbers
- Small talk (`hi`, thanks) is answered directly; every other question goes through RAG
- Limits: **20 uploads / account**, **50 searches / 24h**, password **≥ 8 characters**

## How it works

```
┌──────────────┐
│ Auth         │  ← Signup / login → JWT (Bearer)
└──────┬───────┘
       ↓
┌──────────────┐
│ PDF Upload   │  ← Multer, SHA-256 hash, 20-doc limit
└──────┬───────┘
       ↓
┌──────────────┐
│ PDF Parsing  │  ← pdfjs-dist → pages + text
└──────┬───────┘
       ↓
┌──────────────┐
│ Chunking     │  ← size 1000, overlap 200, pageNumber
└──────┬───────┘
       ↓
┌──────────────┐
│ Embeddings   │  ← Gemini gemini-embedding-2 (batches of 5)
└──────┬───────┘
       ↓
┌──────────────┐
│ MongoDB      │  ← Document + DocumentChunk (userId, documentId)
│ Vector Store │
└──────┬───────┘
       ↓
   User Question  ← selected documentId + Authorization header
       ↓
┌──────────────┐
│ Intent       │  ← greetings skip RAG; everything else searches
└──────┬───────┘
       ↓
┌──────────────┐
│ Query embed  │  ← gemini-embedding-2 → question vector
└──────┬───────┘
       ↓
┌──────────────┐
│ Vector Search│  ← $vectorSearch index autoembed_index
└──────┬───────┘     filter: { documentId }  (ownership already checked)
       ↓
┌──────────────┐
│ Top-K Chunks │  ← Top 5 similar chunks
└──────┬───────┘
       ↓
┌──────────────┐
│ Gemini       │  ← gemini-3.6-flash (fallback: 3.5 / 3.1-flash-lite)
└──────┬───────┘
       ↓
 Answer + Sources  ← answer + file name, page, chunk, score
```

1. Sign in. JWT is stored in `localStorage` (`rag_auth_token`) and sent as `Authorization: Bearer <token>`.
2. Upload a PDF. Text is extracted page by page, chunked, embedded, and saved with your `userId`.
3. Ask a question against a selected document. Pure greetings skip retrieval; everything else is RAG.
4. `$vectorSearch` finds the closest chunks for that `documentId`.
5. Gemini answers from that context only and returns sources with page numbers.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Express, Multer, pdfjs-dist, JWT (HMAC-SHA256), PBKDF2 passwords |
| AI | Google Gemini (`@google/genai`) |
| Database | MongoDB Atlas Vector Search |
| Deploy | Vercel (frontend + serverless backend) |

## Project structure

```
rag-document-qa/
├── backend/
│   ├── index.js
│   ├── config/
│   │   ├── auth.js           # JWT + password hashing
│   │   ├── db.js             # Mongo connect + drop leftover indexes
│   │   ├── gemini.js
│   │   ├── extractPdf.js
│   │   └── pdfPolyfill.js
│   ├── middleware/authMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Document.js       # unique { userId, fileHash }
│   │   └── DocumentChunk.js
│   ├── routes/
│   │   ├── authRoutes.js     # /api/auth/*
│   │   ├── uploadRoutes.js   # upload, list, delete
│   │   └── searchRoutes.js   # /api/search
│   ├── .env.example
│   └── vercel.json
└── frontend/
    ├── .env.example
    └── src/
        ├── App.jsx           # auth gate + layout
        ├── api/
        │   ├── client.js     # fetch helper, token storage, API URL
        │   ├── auth.js
        │   └── documents.js
        └── components/
            ├── AuthScreen.jsx
            ├── LoginForm.jsx
            ├── SignupForm.jsx
            ├── DocumentWorkspace.jsx
            ├── DocumentUpload.jsx
            ├── DocumentQA.jsx
            ├── AnswerCard.jsx
            ├── SourceList.jsx
            └── AppHeader.jsx
```

Secrets stay in **backend `.env`**. The frontend never holds `GEMINI_API_KEY`, `MONGODB_URI`, or `JWT_SECRET`.

## Local setup

You need **two terminals**, Node.js 20+, MongoDB Atlas (vector index **`autoembed_index`**), and a Gemini API key.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env`:

```
PORT=8000
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/ragdoc
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=change-me-to-any-string
```

`JWT_SECRET` can be any non-empty string. Changing it invalidates existing tokens (everyone must log in again).

```bash
npm run dev
```

Backend: [http://localhost:8000](http://localhost:8000)

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend: [http://localhost:5173](http://localhost:5173)

On `localhost` / `127.0.0.1` the UI always calls `http://localhost:8000`. Deployed UI uses `VITE_API_URL` if set, otherwise `https://rag-document-qa-one.vercel.app`.

## API

All routes except health, signup, and login need `Authorization: Bearer <token>`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | no | Health check |
| `POST` | `/api/auth/signup` | no | `{ email, password, name? }` → token + user |
| `POST` | `/api/auth/login` | no | `{ email, password }` → token + user |
| `GET` | `/api/auth/me` | yes | Current user |
| `POST` | `/api/auth/logout` | yes | Client drops the token (JWT is stateless) |
| `POST` | `/api/upload` | yes | PDF (`multipart/form-data`, field `file`) |
| `GET` | `/api/documents` | yes | Your documents only |
| `DELETE` | `/api/documents/:documentId` | yes | Delete document + its chunks |
| `POST` | `/api/search` | yes | `{ "question": "...", "documentId": "..." }` |

`401` on a protected route means missing/invalid token. Frontend treats that as logout.

## MongoDB Atlas

Create a **vector search** index named **`autoembed_index`** on collection `documentchunks`:

| Setting | Value |
|---|---|
| Index name | `autoembed_index` |
| Path | `embedding` |
| Similarity | cosine |
| Dimensions | **3072** (`gemini-embedding-2`) |
| Filter field | `documentId` (type `token` / string) |

Example definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 3072,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "documentId"
    }
  ]
}
```

`$vectorSearch` filters on `documentId` only. Cross-user access is blocked earlier with `Document.findOne({ documentId, userId })`. If you add `userId` to the `$vectorSearch` filter without declaring it as a filter field, Atlas returns `Path 'userId' needs to be indexed as filter` and search 500s.

Also:

- Network Access must allow `0.0.0.0/0` for Vercel.
- Documents unique index is `{ userId: 1, fileHash: 1 }` (same PDF can be uploaded by different accounts).

## Vercel deploy

Two Vercel projects (root directories `backend` and `frontend`).

### Backend project

Root Directory: `backend`

| Name | Required |
|---|---|
| `MONGODB_URI` | Yes |
| `GEMINI_API_KEY` | Yes |
| `JWT_SECRET` | Yes |

Do **not** set `PORT`. Vercel assigns its own.

### Frontend project

Root Directory: `frontend`

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://rag-document-qa-one.vercel.app` |

Vite bakes `VITE_*` vars at **build time**. After adding/changing it, **Redeploy**.

If `VITE_API_URL` is missing, the deployed UI still falls back to the hardcoded backend URL.

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
