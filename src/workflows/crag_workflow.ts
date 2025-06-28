
import { StateGraph, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { CragState } from "../agent/crag_state";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { Document } from "@langchain/core/documents";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { createRetrieverTool } from "langchain/tools/retriever";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const model = new ChatGoogleGenerativeAI({ temperature: 0 });
const tavilyTool = new TavilySearchResults({ maxResults: 3 });
const embeddings = new GoogleGenerativeAIEmbeddings();

// Initialize a retriever for demonstration purposes
async function initializeRetriever() {
  const text = "LangChain is a framework for developing applications powered by language models. It enables applications that are: Data-aware: connect a language model to other sources of data; Agentic: allow a language model to interact with its environment. LangGraph is a library for building stateful, multi-actor applications with LLMs, built on top of LangChain. It enables building complex workflows with cycles, human-in-the-loop, and persistence.";
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.createDocuments([text]);
  const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
  return vectorStore.asRetriever();
}
const retriever = await initializeRetriever();

/**
 * Node for retrieving documents.
 * @param {CragState} state - The current state of the workflow.
 * @returns {Promise<Partial<CragState>>} The updated state with retrieved documents.
 */
async function retrieveNode(state: CragState): Promise<Partial<CragState>> {
  const documents = await retriever.invoke(state.question);
  return { documents };
}

/**
 * Node for grading the relevance of retrieved documents.
 * @param {CragState} state - The current state of the workflow.
 * @returns {Promise<Partial<CragState>>} The updated state with the relevance grade.
 */
async function gradeDocumentsNode(state: CragState): Promise<Partial<CragState>> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a grader. Is the document relevant to the question? Respond with 'yes' or 'no'."],
    ["human", `Question: {question}\nDocument: {document}`],
  ]);
  const documentContent = state.documents[0]?.pageContent || ""; // Assuming one document for simplicity
  const response = await model.invoke(await prompt.formatMessages({ question: state.question, document: documentContent }));
  return { documents_grade: response.content as string };
}

/**
 * Node for performing web search.
 * @param {CragState} state - The current state of the workflow.
 * @returns {Promise<Partial<CragState>>} The updated state with web search results.
 */
async function webSearchNode(state: CragState): Promise<Partial<CragState>> {
  const webSearchResults = await tavilyTool.invoke(state.question);
  return { web_search_results: webSearchResults };
}

/**
 * Node for generating a response.
 * @param {CragState} state - The current state of the workflow.
 * @returns {Promise<Partial<CragState>>} The updated state with the generated response.
 */
async function generateNode(state: CragState): Promise<Partial<CragState>> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful AI assistant. Answer the question based on the provided documents and web search results."],
    ["human", `Question: {question}\nDocuments: {documents}\nWeb Search Results: {web_search_results}`],
  ]);
  const documentsContent = state.documents.map(doc => doc.pageContent).join("\n\n");
  const response = await model.invoke(await prompt.formatMessages({ question: state.question, documents: documentsContent, web_search_results: state.web_search_results }));
  return { generation: response.content as string, messages: state.messages.concat(new AIMessage(response.content as string)) };
}

/**
 * Determines the next action based on document grading.
 * @param {CragState} state - The current state of the workflow.
 * @returns {string} The name of the next node to execute.
 */
function decideToWebSearchNode(state: CragState): string {
  if (state.documents_grade === "yes") {
    return "generate";
  }
  return "web_search";
}

/**
 * Defines the Corrective RAG (CRAG) workflow.
 * @type {StateGraph<CragState>}
 */
const cragWorkflowBuilder = new StateGraph<CragState>({
  channels: {
    question: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    documents: {
      value: (x, y) => y ?? x,
      default: () => [],
    },
    web_search_results: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    generation: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    documents_grade: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    next: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    messages: {
      value: (x, y) => x.concat(y),
      default: () => [],
    },
  },
});

cragWorkflowBuilder.addNode("retrieve", retrieveNode);
cragWorkflowBuilder.addNode("grade_documents", gradeDocumentsNode);
cragWorkflowBuilder.addNode("web_search", webSearchNode);
cragWorkflowBuilder.addNode("generate", generateNode);

cragWorkflowBuilder.addEdge("retrieve", "grade_documents");
cragWorkflowBuilder.addConditionalEdges("grade_documents", decideToWebSearchNode, {
  generate: "generate",
  web_search: "web_search",
});
cragWorkflowBuilder.addEdge("web_search", "generate");
cragWorkflowBuilder.addEdge("generate", END);

cragWorkflowBuilder.setEntryPoint("retrieve");

export const cragWorkflow = cragWorkflowBuilder.compile();
