import mongoose from "mongoose";

const documentChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
      index: true, // "doc-uuid" - used to scope search to a single document
    },

    userId: {
      type: String,
      required: true,
      index: true, // Owner of this chunk — used to block cross-user search
    },

    documentName: {
      type: String,
      required: true, // "react.pdf"
    },

    chunkText: {
      type: String,
      required: true, // "React is a JavaScript library..."
    },

    embedding: {
      type: [Number],
      required: true,  // [0.021, -0.184, 0.763, ...]
    },

    chunkIndex: {
      type: Number,
      required: true,  // Chunk 0 Chunk 1 Chunk 2
    },

    pageNumber: {
      type: Number,
      required: true, // Which PDF page (1-based) this chunk came from
    },
  },
  {
    timestamps: true,
  }
);

const DocumentChunk = mongoose.model(
  "DocumentChunk",
  documentChunkSchema
);

export default DocumentChunk;
