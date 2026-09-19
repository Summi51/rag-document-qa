import express from "express";
import multer from "multer";
import crypto from "crypto";
import ai from "../config/gemini.js";
import Document from "../models/Document.js";
import DocumentChunk from "../models/DocumentChunk.js";
const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

// chunking...
// Chunks a single page's text and tags each chunk with the page it came
// from, so results can show which PDF page an answer was found on.
const createChunks = (text, pageNumber, chunkSize = 1000, overlap = 200) => {
  const chunks = [];

  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;

    const chunkText = text.slice(start, end).trim();

    if (chunkText.length > 0) {
      chunks.push({ text: chunkText, pageNumber });
    }

    start += chunkSize - overlap;
  }

  return chunks;
};

// Enbadding vector

const generateEmbedding = async (text) => {
  const result = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: text,
  });

  return result.embeddings[0].values;
};

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing on the server",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file",
      });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({
        success: false,
        message: "Only PDF files are allowed",
      });
    }

    console.log("File received:");
    console.log("Name:", req.file.originalname);
    console.log("Type:", req.file.mimetype);
    console.log("Size:", req.file.size, "bytes");

    // Unique ID for this document so multiple PDFs can coexist and be
    // searched independently instead of overwriting each other.
    const documentId = crypto.randomUUID();

    const { default: extractPdfText } = await import("../config/extractPdf.js");
    const pdfInfo = await extractPdfText(req.file.buffer);

    console.log("Number of pages:", pdfInfo.total);

    const extractedText = pdfInfo.text;
    const pages = pdfInfo.pages || [];

    console.log("Extracted text length:", extractedText.length);

    // Scanned/image-only or empty PDFs have no extractable text. We do not
    // run OCR, so reject them with a clear message instead of storing junk.
    const hasText = pages.some((page) => page && page.trim().length > 0);

    if (!hasText) {
      return res.status(400).json({
        success: false,
        message: "Could not extract readable text from this PDF",
      });
    }

    // Chunk page-by-page (instead of the whole document at once) so each
    // chunk can be tagged with the PDF page number it came from.
    const allChunks = [];
    let globalChunkIndex = 0;

    for (let index = 0; index < pdfInfo.pages.length; index++) {
      const pageNumber = index + 1;
      const pageText = pdfInfo.pages[index].trim();

      if (!pageText) {
        continue;
      }

      const pageChunks = createChunks(pageText, pageNumber);

      for (const chunk of pageChunks) {
        allChunks.push({
          text: chunk.text,
          pageNumber: chunk.pageNumber,
          chunkIndex: globalChunkIndex,
        });

        globalChunkIndex++;
      }
    }

    console.log("Number of chunks:", allChunks.length);

    if (allChunks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No text chunks were created from this PDF",
      });
    }

    // console.log("\nFirst 3 chunks:\n");

    // chunks.slice(0, 3).forEach((chunk, index) => {
    //   console.log(`--- Chunk ${index + 1} ---`);
    //   console.log(chunk);
    //   console.log();
    // });

    //== Embading first

    // const firstChunkEmbedding = await generateEmbedding(chunks[0]);

    // console.log("First chunk embedding:");
    // console.log(firstChunkEmbedding);

    // console.log(
    //   "Embedding dimensions:",
    //   firstChunkEmbedding.length
    // );

    // chunks - (text) + embading - [9.8,-9,2..] + metadata (aditional info)
    // Generate embeddings concurrently (in small batches) instead of one
    // request at a time, to speed up processing while avoiding overwhelming
    // the API with too many simultaneous requests.
    const EMBEDDING_CONCURRENCY = 5;
    const embeddedChunks = new Array(allChunks.length);

    for (
      let batchStart = 0;
      batchStart < allChunks.length;
      batchStart += EMBEDDING_CONCURRENCY
    ) {
      const batchIndexes = [];

      for (
        let index = batchStart;
        index < Math.min(batchStart + EMBEDDING_CONCURRENCY, allChunks.length);
        index++
      ) {
        batchIndexes.push(index);
      }

      await Promise.all(
        batchIndexes.map(async (index) => {
          const chunk = allChunks[index];
          const embedding = await generateEmbedding(chunk.text);

          embeddedChunks[index] = {
            documentId,
            chunkText: chunk.text,
            embedding,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
          };

          console.log(`Embedding generated for chunk ${index + 1}`);
        })
      );
    }

    // mongodb save
    // Each upload gets its own documentId, so multiple documents can be
    // stored side by side and searched independently (no more wiping out
    // previously uploaded documents).

    const document = await Document.create({
      documentId,
      fileName: req.file.originalname,
    });

    const documentsToInsert = embeddedChunks.map((item) => ({
      documentId: item.documentId,
      documentName: req.file.originalname,
      chunkText: item.chunkText,
      embedding: item.embedding,
      chunkIndex: item.chunkIndex,
      pageNumber: item.pageNumber,
    }));

    await DocumentChunk.insertMany(documentsToInsert);

    console.log(
      `${documentsToInsert.length} chunks saved to MongoDB for document ${document.documentId}`
    );

    //===============
    res.json({
      success: true,
      message: "PDF processed and embeddings stored successfully",
      documentId,
      file: {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
      },
      pages: pdfInfo.total,
      textLength: extractedText.length,
      chunkCount: allChunks.length,
    });
  } catch (error) {
    console.error("PDF upload failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process the PDF",
    });
  }
});

router.get("/documents", async (req, res) => {
  try {
    const documents = await Document.find()
      .sort({ createdAt: -1 })
      .select("documentId fileName createdAt");

    res.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error("Failed to fetch documents:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch documents",
    });
  }
});

export default router;
