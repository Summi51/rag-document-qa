import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing. Add it to backend/.env");
}

const ai = new GoogleGenAI({
  apiKey,
});

export default ai;
