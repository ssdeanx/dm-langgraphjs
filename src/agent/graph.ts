

import { StateGraph, END } from "@langchain/langgraph";
import { AgentType, MessagesState } from "./state.js";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Client } from "langsmith";
import { traceable } from "langsmith/traceable";
import { wrapSDK } from "langsmith/wrappers";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { inMemoryStore } from "../memory/in_memory_store.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { reactAgent } from "./react.js";
import { ragAgent } from "./rag.js";
import { conversationalAgent } from "./conversational.js";
import { researchWorkflow } from "../workflows/research_workflow.js";
import { rewooWorkflow } from "../workflows/rewoo_workflow.js";
import { planExecuteWorkflow } from "../workflows/plan_execute_workflow.js";
import { selfRagWorkflow } from "../workflows/self_rag_workflow.js";
import { cragWorkflow } from "../workflows/crag_workflow.js";
import { collaborationWorkflow } from "../workflows/collaboration_workflow.js";
import { researchTeamWorkflow } from "../workflows/research_team_workflow.js";
import { documentWritingTeamWorkflow } from "../workflows/document_writing_team_workflow.js";
import { reflectionWorkflow } from "../workflows/reflection_workflow.js";
import { generateMermaidPng } from "../utils/graphVisualizer.js";

const model = traceable(new ChatGoogleGenerativeAI({ model: "gemini-2.5-pro", temperature: 0 }));
const embeddings = traceable(new GoogleGenerativeAIEmbeddings());

const langsmithClient = new Client();
wrapSDK(langsmithClient);

// 3. Define the supervisor
const supervisorPrompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a supervisor tasked with managing a conversation between the following agents: react, rag, conversational, research, rewoo, plan_execute, self_rag, crag, collaboration, research_team, document_writing_team, reflection. Given the user's request, determine which agent should act next. If the task is complete, respond with 'FINISH'."],
  ["human", "{input}"],
]);

const supervisor = async (state: MessagesState) => {
  const lastMessage = state.messages[state.messages.length - 1];
  const response = await model.invoke(
    await supervisorPrompt.formatMessages({ input: lastMessage.content as string })
  );
  return {
    next: response.content as AgentType | "FINISH",
  };
};

// 4. Define the graph
const workflow = new StateGraph<MessagesState>({
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

workflow.addNode("react", reactAgent);
workflow.addNode("rag", ragAgent);
workflow.addNode("conversational", conversationalAgent);
workflow.addNode("research", researchWorkflow);
workflow.addNode("rewoo", rewooWorkflow);
workflow.addNode("plan_execute", planExecuteWorkflow);
workflow.addNode("self_rag", selfRagWorkflow);
workflow.addNode("crag", cragWorkflow);
workflow.addNode("collaboration", collaborationWorkflow);
workflow.addNode("research_team", researchTeamWorkflow);
workflow.addNode("document_writing_team", documentWritingTeamWorkflow);
workflow.addNode("reflection", reflectionWorkflow);
workflow.addNode("supervisor", supervisor);

workflow.addConditionalEdges("supervisor", (state) => state.next as AgentType, {
  react: "react",
  rag: "rag",
  conversational: "conversational",
  research: "research",
  rewoo: "rewoo",
  plan_execute: "plan_execute",
  self_rag: "self_rag",
  crag: "crag",
  collaboration: "collaboration",
  research_team: "research_team",
  document_writing_team: "document_writing_team",
  reflection: "reflection",
  FINISH: END,
});

// After each agent, return to the supervisor for the next turn
workflow.addEdge("react", "supervisor");
workflow.addEdge("rag", "supervisor");
workflow.addEdge("conversational", "supervisor");
workflow.addEdge("research", "supervisor");
workflow.addEdge("rewoo", "supervisor");
workflow.addEdge("plan_execute", "supervisor");
workflow.addEdge("self_rag", "supervisor");
workflow.addEdge("crag", "supervisor");
workflow.addEdge("collaboration", "supervisor");
workflow.addEdge("research_team", "supervisor");
workflow.addEdge("document_writing_team", "supervisor");
workflow.addEdge("reflection", "supervisor");

// The entry point is the supervisor
workflow.setEntryPoint("supervisor");

export const graph = workflow.compile({
  store: inMemoryStore,
});

(async () => {
  await generateMermaidPng(graph, "static/graph.png");
})();
