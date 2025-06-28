import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { traceable } from "langsmith/traceable";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable is not set.");
}

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  temperature: 0,
  apiKey: GOOGLE_API_KEY,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: GOOGLE_API_KEY,
});

export { model, embeddings };
