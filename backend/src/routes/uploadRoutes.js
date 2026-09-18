import express from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import ai from "../config/gemini.js";
import DocumentChunk from "../models/DocumentChunk.js";
const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

// chunking... 
const createChunks = (text, chunkSize = 1000, overlap = 200) => {
  const chunks = [];

  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;

    const chunk = text.slice(start, end).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No PDF file uploaded",
      });
    }

    if (req.file.mimetype && req.file.mimetype !== "application/pdf") {
      return res.status(400).json({
        success: false,
        message: "Only PDF files are allowed",
      });
    }

    console.log("File received:");
    console.log("Name:", req.file.originalname);
    console.log("Type:", req.file.mimetype);
    console.log("Size:", req.file.size, "bytes");

    const parser = new PDFParse({
      data: req.file.buffer,
    });

    let pdfData;
    let pdfInfo;

    try {
      pdfData = await parser.getText();
      pdfInfo = await parser.getInfo();
    } finally {
      await parser.destroy();
    }

    console.log("Number of pages:", pdfInfo.total);

    const extractedText = pdfData.text;

    console.log("Extracted text length:", extractedText.length);

    if (!extractedText || !extractedText.trim()) {
      return res.status(400).json({
        success: false,
        message: "No text could be extracted from this PDF",
      });
    }

    const chunks = createChunks(extractedText);

    console.log("Number of chunks:", chunks.length);

    if (chunks.length === 0) {
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
    const embeddedChunks = [];

    for (let index = 0; index < chunks.length; index++) {
      const embedding = await generateEmbedding(chunks[index]);

      embeddedChunks.push({
        chunkText: chunks[index],
        embedding,
        chunkIndex: index,
      });

      console.log(`Embedding generated for chunk ${index + 1}`);
    }

    // mongodb save

     const documentsToInsert = embeddedChunks.map((item) => ({
      documentName: req.file.originalname,
      chunkText: item.chunkText,
      embedding: item.embedding,
      chunkIndex: item.chunkIndex,
    }));

    await DocumentChunk.insertMany(documentsToInsert);

    console.log(
      `${documentsToInsert.length} chunks saved to MongoDB`
    );

    //===============
    res.json({
      success: true,
      message: "PDF processed and chunked successfully",
      file: {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
      },
      pages: pdfInfo.total,
      textLength: extractedText.length,
      chunkCount: chunks.length,
    });
  } catch (error) {
    console.error("PDF processing failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to process PDF",
    });
  }
});

export default router;