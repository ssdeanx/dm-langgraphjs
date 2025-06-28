
import { StateGraph, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { CollaborationState } from "../agent/collaboration_state";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const model = new ChatGoogleGenerativeAI({ temperature: 0 });
const tavilyTool = new TavilySearchResults({ maxResults: 3 });

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
  systemMessage: "You are a research assistant. Use the tavily_search_results_json tool to gather information.",
});

const chartAgent = await createAgent({
  llm: model,
  tools: [chartTool],
  systemMessage: "You are a chart generation assistant. Use the generate_chart tool to create visualizations.",
});

/**
 * Node for the Researcher Agent's turn.
 * @param {CollaborationState} state - The current state of the workflow.
 * @returns {Promise<Partial<CollaborationState>>} The updated state with the agent's response.
 */
async function researcherNode(state: CollaborationState): Promise<Partial<CollaborationState>> {
  const response = await researcherAgent.invoke({ messages: state.messages });
  return { messages: [new AIMessage({ content: response.content, name: "researcher" })], sender: "researcher" };
}

/**
 * Node for the Chart Agent's turn.
 * @param {CollaborationState} state - The current state of the workflow.
 * @returns {Promise<Partial<CollaborationState>>} The updated state with the agent's response.
 */
async function chartNode(state: CollaborationState): Promise<Partial<CollaborationState>> {
  const response = await chartAgent.invoke({ messages: state.messages });
  return { messages: [new AIMessage({ content: response.content, name: "chart" })], sender: "chart" };
}

/**
 * Determines the next agent to call based on the last sender.
 * @param {CollaborationState} state - The current state of the workflow.
 * @returns {string} The name of the next node to execute.
 */
function routeAgent(state: CollaborationState): string {
  if (state.sender === "researcher") {
    // If researcher just sent a message, decide if chart agent is needed
    if (state.messages[state.messages.length - 1].content.includes("chart")) {
      return "chart";
    }
    return END; // Researcher is done, end collaboration
  }
  // If chart agent just sent a message, it's done
  return END;
}

/**
 * Defines the multi-agent collaboration workflow.
 * @type {StateGraph<CollaborationState>}
 */
const collaborationWorkflowBuilder = new StateGraph<CollaborationState>({
  channels: {
    messages: {
      value: (x, y) => x.concat(y),
      default: () => [],
    },
    sender: {
      value: (x, y) => y ?? x,
      default: () => "user",
    },
    next: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
  },
});

collaborationWorkflowBuilder.addNode("researcher", researcherNode);
collaborationWorkflowBuilder.addNode("chart", chartNode);

collaborationWorkflowBuilder.addEdge("researcher", "routeAgent");
collaborationWorkflowBuilder.addEdge("chart", END);

collaborationWorkflowBuilder.addConditionalEdges("routeAgent", routeAgent, {
  chart: "chart",
  __end__: END,
});

collaborationWorkflowBuilder.setEntryPoint("researcher");

export const collaborationWorkflow = collaborationWorkflowBuilder.compile();
