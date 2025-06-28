import { StateGraph, END, Annotation, START } from "@langchain/langgraph";
import { AgentType, MessagesState } from "./state.js";
import { model } from "../config/googleProvider.js";
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
import { BaseMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents"; // Added for Document type in MessagesState

// Define a type for all possible node names in the graph
type NodeNames = AgentType | "supervisor";

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
const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  next: Annotation<AgentType | "FINISH" | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  scratchpad: Annotation<any>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  query: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  research_data: Annotation<string[] | undefined>({
    reducer: (x, y) => x?.concat(y || []) || y,
    default: () => undefined,
  }),
  summary: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  report: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  task: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  planString: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  steps: Annotation<string[][] | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  results: Annotation<Record<string, any> | undefined>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  result: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  input: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  plan: Annotation<string[] | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  pastSteps: Annotation<[string, string][] | undefined>({
    reducer: (x, y) => x?.concat(y || []) || y,
    default: () => undefined,
  }),
  response: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  question: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  documents: Annotation<Document[] | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  generation: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  generationVQuestionGrade: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  generationVDocumentsGrade: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  web_search_results: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  documents_grade: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  sender: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  request: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  content: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  critique: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
});

const workflow = new StateGraph(GraphState);

// Wrapper functions for each workflow to ensure type compatibility with MessagesState
const wrapWorkflow = (workflow: any) => async (state: MessagesState): Promise<Partial<MessagesState>> => {
  const result = await workflow.invoke(state); // Pass the entire state
  return result; // Assume the workflow returns a Partial<MessagesState>
};

workflow.addNode("react", wrapWorkflow(reactAgent));
workflow.addNode("rag", wrapWorkflow(ragAgent));
workflow.addNode("conversational", wrapWorkflow(conversationalAgent));
workflow.addNode("research", wrapWorkflow(researchWorkflow));
workflow.addNode("rewoo", wrapWorkflow(rewooWorkflow));
workflow.addNode("plan_execute", wrapWorkflow(planExecuteWorkflow));
workflow.addNode("self_rag", wrapWorkflow(selfRagWorkflow));
workflow.addNode("crag", wrapWorkflow(cragWorkflow));
workflow.addNode("collaboration", wrapWorkflow(collaborationWorkflow));
workflow.addNode("research_team", wrapWorkflow(researchTeamWorkflow));
workflow.addNode("document_writing_team", wrapWorkflow(documentWritingTeamWorkflow));
workflow.addNode("reflection", wrapWorkflow(reflectionWorkflow));
workflow.addNode("supervisor", supervisor);

const members = [
  "react",
  "rag",
  "conversational",
  "research",
  "rewoo",
  "plan_execute",
  "self_rag",
  "crag",
  "collaboration",
  "research_team",
  "document_writing_team",
  "reflection",
];

workflow.addConditionalEdges(
  "supervisor" as any,
  (state: MessagesState) => state.next as AgentType | "FINISH",
  {
    ...members.reduce((acc, member) => {
      acc[member] = member;
      return acc;
    }, {} as Record<string, string>),
    FINISH: END,
  } as any
);

// Set the entry point using addEdge(START, key)
workflow.addEdge(START as any, "supervisor" as any);

// Add edges from each member back to the supervisor
for (const member of members) {
  workflow.addEdge(member as any, "supervisor" as any);
}

export const graph = workflow.compile({
  store: inMemoryStore,
});

(async () => {
  await generateMermaidPng(graph, "static/graph.png");
})();
