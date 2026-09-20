import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    fileName: {
      type: String,
      required: true,
    },

    fileHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ userId: 1, fileHash: 1 }, { unique: true });

const Document = mongoose.model("Document", documentSchema);

export default Document;
