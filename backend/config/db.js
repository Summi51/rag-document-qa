import mongoose from "mongoose";
import Document from "../models/Document.js";

let connecting;

// Before auth, `fileHash` was globally unique. Uploads are now scoped per
// user, so that leftover index makes the same PDF un-uploadable by a second
// account (Mongo E11000 on Document.create). Mongoose creates the indexes
// declared in the schema but never drops ones it no longer knows about.
const dropLegacyIndexes = async () => {
  try {
    const indexes = await Document.collection.indexes();
    const hasLegacyHashIndex = indexes.some(
      (index) => index.name === "fileHash_1"
    );

    if (hasLegacyHashIndex) {
      await Document.collection.dropIndex("fileHash_1");
      console.log("Dropped legacy unique index fileHash_1");
    }
  } catch (error) {
    console.error("Legacy index cleanup skipped:", error.message);
  }
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connecting) {
    return connecting;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Add it to backend/.env or Vercel env vars");
  }

  connecting = mongoose
    .connect(process.env.MONGODB_URI)
    .then(async (connection) => {
      console.log("MongoDB connected successfully");
      await dropLegacyIndexes();
      return connection;
    })
    .catch((error) => {
      connecting = null;
      console.error("MongoDB connection failed:", error.message);
      throw error;
    });

  return connecting;
};

export default connectDB;
