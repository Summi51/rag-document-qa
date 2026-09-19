import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error(
    "GEMINI_API_KEY is missing. Add it to backend/.env or Vercel env vars"
  );
}

const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
    })
  : null;

export default ai;
