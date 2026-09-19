import mongoose from "mongoose";

let connecting;

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
    .then((connection) => {
      console.log("MongoDB connected successfully");
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
