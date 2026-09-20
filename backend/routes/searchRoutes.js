import express from "express";

import ai from "../config/gemini.js";
import authMiddleware from "../middleware/authMiddleware.js";
import Document from "../models/Document.js";
import DocumentChunk from "../models/DocumentChunk.js";
import User from "../models/User.js";

const router = express.Router();

const MAX_SEARCHES_PER_DAY = 50;

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

// The user always asks questions against a document they explicitly selected,
// so document lookup (RAG) is the default. This classifier only exists to
// short-circuit pure small talk (greetings, thanks, farewells) so we skip a
// wasted embedding + vector search for those.
//
// Deliberately conservative: anything that is not clear small talk goes to
// RAG. Previously vague/general-sounding questions ("what is role of job?")
// were answered from the model's own knowledge with empty sources, which is
// exactly the behaviour we do not want when a document is selected.
const classifyAndMaybeAnswer = async (question) => {
  const classifierPrompt = `You are a routing assistant in front of a document Q&A system.

The user has already selected one uploaded document and is asking about it. Your only job is to catch pure small talk.

Respond with ONLY compact JSON, no markdown, in exactly this shape:
{"needsDocument": true|false, "answer": "<your direct reply, or empty string if needsDocument is true>"}

Rules:
- Set needsDocument to false ONLY when the message is purely a greeting, farewell, thanks, or casual small talk. Then give a short friendly reply as a document assistant.
- For EVERY other message, set needsDocument to true and leave answer as an empty string. This includes short questions, vague questions, and questions that sound general ("what is the role?", "what is experience?", "tell me about this", "candidate details"). They must be answered from the selected document.
- Never ask the user to clarify and never answer from your own knowledge.

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

router.post("/search", authMiddleware, async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing on the server",
      });
    }

    const userId = req.user.userId;
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

    const user = await User.findOne({ userId });
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const searchCount =
      user?.searchCountResetAt && user.searchCountResetAt > dayAgo
        ? user.searchCount || 0
        : 0;

    if (searchCount >= MAX_SEARCHES_PER_DAY) {
      return res.status(429).json({
        success: false,
        message: `Query limit reached (${MAX_SEARCHES_PER_DAY} questions per day)`,
      });
    }

    const document = await Document.findOne({ documentId, userId });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    await User.updateOne(
      { userId },
      {
        $set: {
          searchCount: searchCount + 1,
          searchCountResetAt:
            user?.searchCountResetAt && user.searchCountResetAt > dayAgo
              ? user.searchCountResetAt
              : now,
        },
      }
    );

    console.log("Question:", question);

    // 0. Skip the document pipeline only for pure small talk. Any failure in
    //    the classifier falls back to RAG, never to a generic 500, because a
    //    document question must always be answerable.
    let needsDocument = true;
    let directAnswer = "";

    try {
      const classification = await classifyAndMaybeAnswer(question);
      needsDocument = classification.needsDocument;
      directAnswer = classification.answer;
    } catch (error) {
      console.error(
        "Intent classification failed, falling back to document search:",
        error.message
      );
    }

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
    //
    // Ownership is already enforced above (`Document.findOne({ documentId,
    // userId })`), so filtering on documentId alone is safe — every chunk
    // with this documentId was written with this user's userId at upload
    // time.
    //
    // We deliberately do NOT add `userId` to the vector search filter: Atlas
    // only accepts fields declared in the index's `filter` list, and a
    // non-indexed field makes the whole aggregation fail
    // ("Path 'userId' needs to be indexed as filter") and the request 500s.
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

The user is asking about the document "${document.fileName}". Answer the question using ONLY the context below, which is taken from that document.

Rules:
- Answer in the same language the question is written in.
- Answer directly and completely. Do not ask the user to clarify or rephrase.
- A short or vague question is still a real question — interpret it against the document and answer with what the context supports.
- Include the concrete details from the context (role, experience, skills, dates, numbers, names) when they are relevant.
- If the context only partially answers the question, answer with the part it does support and stop, instead of refusing.
- Only if the context contains nothing usable, reply exactly:
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
