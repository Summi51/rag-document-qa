import express from "express";

import ai from "../config/gemini.js";
import Document from "../models/Document.js";
import DocumentChunk from "../models/DocumentChunk.js";

const router = express.Router();

const ANSWER_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
];

// Fast/cheap model used only to decide whether a question needs document
// retrieval (RAG) or can be answered directly (greetings, small talk,
// general knowledge, unclear input). This replaces any hardcoded keyword
// list — the model itself decides, so it generalizes to inputs we never
// explicitly coded for.
const CLASSIFIER_MODEL = "gemini-3.1-flash-lite";

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

// Asks Gemini to decide, on its own, whether the question needs the
// uploaded document (RAG) or can be answered directly (greeting, small
// talk, general knowledge, or unclear/ambiguous input). When it can be
// answered directly, Gemini also produces that answer in the same call,
// so we avoid a second round-trip and skip embeddings/vector search
// entirely for non-document questions.
const classifyAndMaybeAnswer = async (question) => {
  const classifierPrompt = `You are a routing assistant in front of a document Q&A system.

Decide whether the user's message requires looking up an uploaded document to answer, or whether you can answer it yourself right away (e.g. greetings, farewells, thanks, small talk, general knowledge, or unclear/ambiguous input).

Respond with ONLY compact JSON, no markdown, in exactly this shape:
{"needsDocument": true|false, "answer": "<your direct reply, or empty string if needsDocument is true>"}

Rules:
- If the message is a greeting, farewell, thanks, or casual small talk, set needsDocument to false and give a short friendly reply as a document assistant.
- If the message asks something general that does not depend on a specific uploaded document, set needsDocument to false and answer it yourself using your own knowledge.
- If the message is unclear/ambiguous, set needsDocument to false and politely ask the user to clarify.
- If the message is clearly asking about content that would be inside an uploaded document, set needsDocument to true and leave answer as an empty string.

User message: ${question}`;

  const response = await ai.models.generateContent({
    model: CLASSIFIER_MODEL,
    contents: classifierPrompt,
  });

  const raw = (response.text || "").trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    // If the classifier didn't return usable JSON, fall back to RAG
    // rather than guessing, so existing behavior is not disrupted.
    return { needsDocument: true, answer: "" };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      needsDocument: Boolean(parsed.needsDocument),
      answer: typeof parsed.answer === "string" ? parsed.answer : "",
    };
  } catch (error) {
    return { needsDocument: true, answer: "" };
  }
};

router.post("/search", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing on the server",
      });
    }

    const { question, documentId } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: "documentId is required",
      });
    }

    const document = await Document.findOne({ documentId });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    console.log("Question:", question);

    // 0. Let Gemini itself decide whether this question needs the
    //    uploaded document or can be answered directly (greeting, small
    //    talk, general knowledge, unclear input). No hardcoded word list.
    const { needsDocument, answer: directAnswer } = await classifyAndMaybeAnswer(
      question
    );

    if (!needsDocument) {
      console.log("Handled directly by Gemini, skipping RAG pipeline");

      return res.json({
        success: true,
        question,
        answer: directAnswer,
        sources: [],
      });
    }

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
          index: "autoembed_index",
          path: "embedding",
          queryVector: queryVector,
          numCandidates: 100,
          limit: 5,
          filter: {
            documentId: documentId,
          },
        },
      },
      {
        $project: {
          _id: 1,
          documentName: 1,
          chunkText: 1,
          chunkIndex: 1,
          pageNumber: 1,
          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ]);

    console.log("Retrieved chunks:", results.length);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "I could not find relevant information in this document",
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

    return res.status(500).json({
      success: false,
      message: "Failed to generate an answer",
    });
  }
});

export default router;

// $vectorSearch
// "Mere paas question ka vector hai.
// Database mein jo vectors iske meaning ke closest hain, unko find karo."
