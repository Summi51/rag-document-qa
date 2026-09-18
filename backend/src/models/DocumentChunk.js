import mongoose from "mongoose";

const documentChunkSchema = new mongoose.Schema(
  {
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