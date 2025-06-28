import { StateGraph, END, START } from "@langchain/langgraph"; // Added START
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { CollaborationState } from "../agent/collaboration_state.js";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { model } from "../config/googleProvider.js";
import { tavilyTool } from "../tools/tavily.js";

// Define a simple chart tool (placeholder for actual chart generation)
const chartTool = tool(
  async ({ data }) => {
    // In a real scenario, this would generate a chart image or data visualization
    return `Generated a chart with data: ${JSON.stringify(data)}.`;
  },
  {
    name: "generate_chart",
    description: "Generates a chart based on provided data.",
    schema: z.object({
      data: z.array(z.object({ label: z.string(), value: z.number() })).describe("Data to generate the chart from."),
    }),
  }
);

/**
 * Helper function to create a specialized agent.
 * @param {object} params - Parameters for creating the agent.
 * @param {ChatGoogleGenerativeAI} params.llm - The language model to use.
 * @param {any[]} params.tools - The tools available to the agent.
 * @param {string} params.systemMessage - The system message for the agent.
 * @returns {Function} An agent function.
 */
async function createAgent({ llm, tools, systemMessage }: { llm: ChatGoogleGenerativeAI; tools: any[]; systemMessage: string; }) {
  const toolNames = tools.map((tool) => tool.name).join(", ");
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a helpful AI assistant, collaborating with other assistants. ${systemMessage} You have access to the following tools: ${toolNames}.`],
    ["placeholder", "{messages}"],
  ]);
  return prompt.pipe(llm.bind({ tools }));
}

// Specialized Agents
const researcherAgent = await createAgent({
  llm: model,
  tools: [tavilyTool],
  systemMessage: "You are a research assistant. Use the tavily_search tool to gather information.",
});

const chartAgent = await createAgent({
  llm: model,
  tools: [chartTool],
  systemMessage: "You are a chart generation assistant. Use the generate_chart tool to create visualizations.",
});

/**
 * Defines the multi-agent collaboration workflow.
 * @type {StateGraph<CollaborationState>}
 */

/**
 * Defines the multi-agent collaboration workflow.
 * @type {StateGraph<CollaborationState>}
 */
const collaborationWorkflowBuilder = new StateGraph<CollaborationState>({
  channels: {
    messages: {
      value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y), // Explicitly typed
      default: () => [],
    },
    sender: {
      value: (x: string, y: string) => y ?? x, // Explicitly typed
      default: () => "user",
    },
    next: {
      value: (x: string, y: string) => y ?? x, // Explicitly typed
      default: () => "",
    },
  },
});

collaborationWorkflowBuilder.addNode("researcher", researcherNode);
collaborationWorkflowBuilder.addNode("chart", chartNode);

// Fix: Cast node names to `any` to bypass type errors (see #file:graph.ts)
collaborationWorkflowBuilder.addEdge(START, "researcher"); // Initial edge from START to researcher

collaborationWorkflowBuilder.addConditionalEdges(
  "researcher",
  (state: CollaborationState) => state.next,
  {
    chart: "chart",
    __end__: END,
  }
);

collaborationWorkflowBuilder.addConditionalEdges(
  "chart",
  (state: CollaborationState) => state.next,
  {
    __end__: END,
  }
);

 

export const collaborationWorkflow = collaborationWorkflowBuilder.compile();
