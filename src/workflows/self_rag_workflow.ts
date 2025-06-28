
import { StateGraph, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SelfRagState } from "../agent/self_rag_state";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { createRetrieverTool } from "langchain/tools/retriever";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const model = new ChatGoogleGenerativeAI({ temperature: 0 });
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
 * @param {SelfRagState} state - The current state of the workflow.
 * @returns {Promise<Partial<SelfRagState>>} The updated state with retrieved documents.
 */
async function retrieveNode(state: SelfRagState): Promise<Partial<SelfRagState>> {
  const documents = await retriever.invoke(state.question);
  return { documents };
}

/**
 * Node for generating a response.
 * @param {SelfRagState} state - The current state of the workflow.
 * @returns {Promise<Partial<SelfRagState>>} The updated state with the generated response.
 */
async function generateNode(state: SelfRagState): Promise<Partial<SelfRagState>> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful AI assistant. Answer the question based on the provided documents."],
    ["human", `Question: {question}\nDocuments: {documents}`],
  ]);
  const documentsContent = state.documents.map(doc => doc.pageContent).join("\n\n");
  const response = await model.invoke(await prompt.formatMessages({ question: state.question, documents: documentsContent }));
  return { generation: response.content as string, messages: state.messages.concat(new AIMessage(response.content as string)) };
}

/**
 * Node for grading the relevance of retrieved documents to the question.
 * @param {SelfRagState} state - The current state of the workflow.
 * @returns {Promise<Partial<SelfRagState>>} The updated state with the relevance grade.
 */
async function gradeDocumentsNode(state: SelfRagState): Promise<Partial<SelfRagState>> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a grader. Is the document relevant to the question? Respond with 'yes' or 'no'."],
    ["human", `Question: {question}\nDocument: {document}`],
  ]);
  const documentContent = state.documents[0]?.pageContent || ""; // Assuming one document for simplicity
  const response = await model.invoke(await prompt.formatMessages({ question: state.question, document: documentContent }));
  return { generationVQuestionGrade: response.content as string };
}

/**
 * Node for grading whether the generation is supported by documents.
 * @param {SelfRagState} state - The current state of the workflow.
 * @returns {Promise<Partial<SelfRagState>>} The updated state with the support grade.
 */
async function gradeGenerationSupportNode(state: SelfRagState): Promise<Partial<SelfRagState>> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a grader. Is the generated answer supported by the documents? Respond with 'yes' or 'no'."],
    ["human", `Documents: {documents}\nGenerated Answer: {generation}`],
  ]);
  const documentsContent = state.documents.map(doc => doc.pageContent).join("\n\n");
  const response = await model.invoke(await prompt.formatMessages({ documents: documentsContent, generation: state.generation }));
  return { generationVDocumentsGrade: response.content as string };
}

/**
 * Node for deciding whether to re-evaluate (re-retrieve or re-generate) or conclude.
 * @param {SelfRagState} state - The current state of the workflow.
 * @returns {string} The name of the next node to execute.
 */
function decideToReEvaluateNode(state: SelfRagState): string {
  if (state.generationVQuestionGrade === "yes" && state.generationVDocumentsGrade === "yes") {
    return END; // All good, conclude
  }
  if (state.generationVQuestionGrade === "no") {
    return "retrieve"; // Documents not relevant, re-retrieve
  }
  return "generate"; // Generation not supported, re-generate
}

/**
 * Defines the Self-RAG workflow.
 * @type {StateGraph<SelfRagState>}
 */
const selfRagWorkflowBuilder = new StateGraph<SelfRagState>({
  channels: {
    question: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    documents: {
      value: (x, y) => y ?? x,
      default: () => [],
    },
    generation: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    generationVQuestionGrade: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    generationVDocumentsGrade: {
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

selfRagWorkflowBuilder.addNode("retrieve", retrieveNode);
selfRagWorkflowBuilder.addNode("generate", generateNode);
selfRagWorkflowBuilder.addNode("grade_documents", gradeDocumentsNode);
selfRagWorkflowBuilder.addNode("grade_generation_support", gradeGenerationSupportNode);

selfRagWorkflowBuilder.addEdge("retrieve", "generate");
selfRagWorkflowBuilder.addEdge("generate", "grade_documents");
selfRagWorkflowBuilder.addEdge("grade_documents", "grade_generation_support");
selfRagWorkflowBuilder.addConditionalEdges("grade_generation_support", decideToReEvaluateNode, {
  retrieve: "retrieve",
  generate: "generate",
  __end__: END,
});

selfRagWorkflowBuilder.setEntryPoint("retrieve");

export const selfRagWorkflow = selfRagWorkflowBuilder.compile();
