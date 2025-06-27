/**
 * Starter LangGraph.js Template
 * Make this code your own!
 */
import { StateGraph } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { StateAnnotation } from "./state.js";
import { config } from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage } from "@langchain/core/messages";

/**
 * Define a node, these do the work of the graph and should have most of the logic.
 * Must return a subset of the properties set in StateAnnotation.
 * @param state The current state of the graph.
 * @param config Extra parameters passed into the state graph.
 * @returns Some subset of parameters of the graph state, used to update the state
 * for the edges and nodes executed next.
 */
config(); // Load environment variables from .env

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
});

const callModel = async (
  state: typeof StateAnnotation.State,
  _config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> => {
  if (!state.messages.length) {
    return { messages: [] };
  }
  let aiResponse;
  let errors = state.errors || [];
  let toolResults = state.toolResults || [];
  let retrievedDocs = state.retrievedDocs || [];
  let step = typeof state.step === "number" ? state.step + 1 : 1;
  try {
    aiResponse = await model.invoke(state.messages);
    // Example: simulate tool usage and document retrieval
    // (Replace with real tool/doc logic as needed)
    toolResults = [...toolResults, { used: false, ts: Date.now() }];
    retrievedDocs = [...retrievedDocs, { doc: "Sample doc", ts: Date.now() }];
  } catch (err) {
    errors = [...errors, (err as Error).message];
    aiResponse = undefined;
  }
  return {
    messages: aiResponse ? [...state.messages, aiResponse] : state.messages,
    step,
    toolResults,
    retrievedDocs,
    errors,
    userProfile: state.userProfile,
    conversationId: state.conversationId,
  };
};

/**
 * Routing function: Determines whether to continue research or end the builder.
 * This function decides if the gathered information is satisfactory or if more research is needed.
 *
 * @param state - The current state of the research builder
 * @returns Either "callModel" to continue research or END to finish the builder
 */
export const route = (
  state: typeof StateAnnotation.State,
): "__end__" | "callModel" => {
  // End if the last message is from the assistant
  if (
    state.messages.length > 0 &&
    state.messages[state.messages.length - 1] instanceof AIMessage
  ) {
    return "__end__";
  }
  return "callModel";
};

// Finally, create the graph itself.
const builder = new StateGraph(StateAnnotation)
  // Add the nodes to do the work.
  // Chaining the nodes together in this way
  // updates the types of the StateGraph instance
  // so you have static type checking when it comes time
  // to add the edges.
  .addNode("callModel", callModel)
  // Regular edges mean "always transition to node B after node A is done"
  // The "__start__" and "__end__" nodes are "virtual" nodes that are always present
  // and represent the beginning and end of the builder.
  .addEdge("__start__", "callModel")
  // Conditional edges optionally route to different nodes (or end)
  .addConditionalEdges("callModel", route);

export const graph = builder.compile();

graph.name = "New Agent";
