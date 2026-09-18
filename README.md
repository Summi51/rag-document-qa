# rag-document-qa

  // "type": "commonjs",


                   PDF
                  ↓
            Text Extraction
                  ↓
               Chunking
                  ↓
              Embeddings
                  ↓
               MongoDB
                  ↓
          ┌───────────────┐
          │ Vector Search │
          └───────┬───────┘
                  ↑
                  │
            User Question
                  ↓
          Question Embedding
                  ↓
          Relevant Chunks
                  ↓
              Context
                  ↓
              RAG Prompt
                  ↓
                Gemini
                  ↓
             Final Answer