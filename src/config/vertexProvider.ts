import { ChatVertexAI } from "@langchain/google-vertexai";
import { traceable } from "langsmith/traceable";

const vertexModel = new ChatVertexAI({
  model: "gemini-2.5-pro", // Using a model compatible with Vertex AI
  temperature: 0,
});

export { vertexModel };
