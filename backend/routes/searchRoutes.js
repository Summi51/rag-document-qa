import express from "express";

import ai from "../config/gemini.js";
import DocumentChunk from "../models/DocumentChunk.js";

const router = express.Router();

const ANSWER_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableGeminiError = (error) => {
  const status = error?.status || error?.code;
  const message = error?.message || "";

  return (
    status === 503 ||
    status === 429 ||
    message.includes("high demand") ||
    message.includes("UNAVAILABLE")
  );
};

const generateAnswer = async (prompt) => {
  let lastError;

  for (const model of ANSWER_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Generating answer with ${model} (attempt ${attempt})`);

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        return response.text;
      } catch (error) {
        lastError = error;

        if (!isRetryableGeminiError(error) || attempt === 3) {
          break;
        }

        await wait(1000 * attempt);
      }
    }
  }

  throw lastError;
};

router.post("/search", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing on the server",
      });
    }

    const { question } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    console.log("Question:", question);

    // 1. Generate embedding for the user's question
    const embeddingResult = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: question,
    });

    const queryVector = embeddingResult.embeddings[0].values;

    console.log(
      "Query embedding dimensions:",
      queryVector.length
    );

    // 2. Find relevant document chunks
    const results = await DocumentChunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryVector,
          numCandidates: 100,
          limit: 5,
        },
      },
      {
        $project: {
          _id: 1,
          documentName: 1,
          chunkText: 1,
          chunkIndex: 1,
          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ]);

    console.log("Retrieved chunks:", results.length);

    if (results.length === 0) {
      return res.json({
        success: true,
        question,
        answer: "I could not find the answer in the uploaded document.",
        sources: [],
      });
    }

    // 3. Build context from retrieved chunks
    const context = results
      .map((result, index) => {
        return `[Chunk ${index + 1}]\n${result.chunkText}`;
      })
      .join("\n\n");

    // 4. Build RAG prompt
    const prompt = `
You are a document question-answering assistant.

Answer the user's question using only the provided context.

If the answer is not present in the context, clearly say:
"I could not find the answer in the uploaded document."

Context:
${context}

Question:
${question}

Answer:
`;

    // 5. Generate answer using Gemini
    const answer = await generateAnswer(prompt);

    console.log("Generated answer:");
    console.log(answer);

    // 6. Return answer + retrieved sources
    res.json({
      success: true,
      question,
      answer,
      sources: results,
    });
  } catch (error) {
    console.error("RAG search failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate answer",
    });
  }
});

export default router;

// $vectorSearch
// "Mere paas question ka vector hai.
// Database mein jo vectors iske meaning ke closest hain, unko find karo."
