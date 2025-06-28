import { model, embeddings } from "../config/googleProvider.js";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { createRetrieverTool } from "langchain/tools/retriever";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { glob } from "glob";
import * as fs from "fs/promises";
import { parsePdfTool, convertDocxToTextTool, parseCsvTool, parseXmlTool, extractTextFromFileTool } from "../tools/document_processing.js";
import { StateGraph, END } from "@langchain/langgraph";
import { MessagesState } from "./state.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AIMessage } from "@langchain/core/messages";




// Initialize retriever from Docs directory
async function initializeRetriever() {
  const files = await glob("Docs/**/*.md");
  const docs = await Promise.all(
    files.map(async (file) => {
      const content = await fs.readFile(file, "utf-8");
      return new Document({ pageContent: content, metadata: { source: file } });
    })
  );

  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
  const splitDocs = await textSplitter.splitDocuments(docs);

  // You must provide an embeddings instance as the second argument.
  // Replace `model.embeddings` with your actual embeddings object if different.
  const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
  return vectorStore.asRetriever();
}
const retriever = await initializeRetriever();

const ragTools = [
  createRetrieverTool(retriever, {
    name: "langgraph_docs_retriever",
    description:
      "Search for information about LangGraph.js in the project documentation. For any questions about LangGraph.js, you must use this tool!",
  }),
  parsePdfTool, convertDocxToTextTool, parseCsvTool, parseXmlTool, extractTextFromFileTool
];

/**
 * Node for retrieving documents based on the user's query.
 * @param {MessagesState} state - The current state of the messages.
 * @returns {Promise<Partial<MessagesState>>} The updated state with retrieved documents.
 */
async function retrieveNode(state: MessagesState): Promise<Partial<MessagesState>> {
  try {
    const lastMessage = state.messages[state.messages.length - 1];
    const documents = await retriever.invoke(lastMessage.content as string);
    const documentContent = documents.map(doc => doc.pageContent).join("\n\n");
    return { scratchpad: documentContent };
  } catch (error: any) {
    console.error("Error in RAG retrieve node:", error);
    return { messages: [new AIMessage(`Error retrieving documents: ${error.message}`)] };
  }
}

/**
 * Node for generating a response based on retrieved documents.
 * @param {MessagesState} state - The current state of the messages.
 * @returns {Promise<Partial<MessagesState>>} The updated state with the generated response.
 */
async function generateNode(state: MessagesState): Promise<Partial<MessagesState>> {
  try {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful AI assistant. Answer the question based on the following context:\n      {context}"],
      ["human", "{question}"],
    ]);
    const lastMessage = state.messages[state.messages.length - 1];
    const response = await model.invoke(
      await prompt.formatMessages({ context: state.scratchpad, question: lastMessage.content as string })
    );
    return { messages: [response] };
  } catch (error: any) {
    console.error("Error in RAG generate node:", error);
    return { messages: [new AIMessage(`Error generating response: ${error.message}`)] };
  }
}

/**
 * Determines the next action for the RAG agent (continue or handoff).
 * @param {MessagesState} state - The current state of the messages.
 * @returns {Promise<string>} The name of the next node to execute or END.
 */
async function ragAgentRouter(state: MessagesState): Promise<string> {
  // For now, the RAG agent always ends after generating a response.
  // Future enhancements could include self-reflection or handoff based on confidence.
  return END; // Handoff to supervisor (ends this subgraph)
}

/**
 * Defines the RAG agent workflow.
 * @type {StateGraph<MessagesState>}
 */
const ragWorkflowBuilder = new StateGraph<MessagesState>({
  channels: {
    messages: {
      value: (x, y) => x.concat(y),
      default: () => [],
    },
    next: {
      value: (x, y) => y ?? x,
      default: () => undefined,
    },
    scratchpad: {
      value: (x, y) => y ?? x,
      default: () => undefined,
    },
  },
});

ragWorkflowBuilder.addNode("retrieve", retrieveNode);
ragWorkflowBuilder.addNode("generate", generateNode);

ragWorkflowBuilder.addEdge("retrieve", "generate");
ragWorkflowBuilder.addEdge("generate", "ragAgentRouter");
ragWorkflowBuilder.addConditionalEdges("ragAgentRouter", ragAgentRouter, {
  __end__: END, // Handoff to supervisor (ends this subgraph)
});

ragWorkflowBuilder.setEntryPoint("retrieve");

export const ragAgent = ragWorkflowBuilder.compile();
