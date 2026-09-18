import "dotenv/config";
import express from "express";
import cors from "cors";
import uploadRoutes from "./routes/uploadRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import connectDB from "./config/db.js";
import ai from "./config/gemini.js";

const app = express();

const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use("/api", uploadRoutes);
app.use("/api", searchRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "RAG Document Q&A Backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is healthy",
  });
});

const startServer = async () => {
  await connectDB();

  if (ai) {
    console.log("Gemini client configured");
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
};

startServer();

export default app;

// 1. RAG mein hum chahte hain:

// Question
//    +
// Relevant information from YOUR document
//    ↓
// Gemini


// 2. Gemini ko denge, to Gemini apni general knowledge se answer de sakta hai.


// 3. Example -

// Question user:
// What is React used for?

// Context:
// React is a JavaScript library for building
// user interfaces.

// Gemini answer karega:

// React is a JavaScript library used for
// building user interfaces. <- Yahi Retrieval-Augmented Generation hai.

//Important:
// RAG hallucination ko eliminate nahi karta.

//==============================

// Context:

// [Chunk 1]
// React is a UI library...

// [Chunk 2]
// React components...

// [Chunk 3]
// React uses a virtual DOM...

// Is combined text ko context bolenge.

//================================
// Prompt

// Prompt basically Gemini ko instruction + information deta hai.

// ??+++++++++==================

// You are answering questions using the provided context.

// Context:
// ...

// Question:
// ...

// Answer only using the context.
// If the answer is not present in the context,
// say that you could not find it in the document.
// Ye important hai.

// Agar document mein answer nahi hai, model ko random
// answer generate karne ke bajay batana chahiye ki information context mein nahi mili.