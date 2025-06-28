import { model } from "../config/googleProvider.js";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, END } from "@langchain/langgraph";
import { MessagesState, AgentType } from "../agent/state.js";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// Import all tools
import { tavilyTool } from "../tools/tavily.js";
import { evaluateExpressionTool, addNumbersTool, subtractNumbersTool, multiplyNumbersTool, divideNumbersTool, powerTool, sqrtTool, sinTool, cosTool, tanTool, logTool, absTool, roundTool, floorTool, ceilTool } from "../tools/calculator";
import { listRepositoriesTool, getFileContentTool, createIssueTool, createRepositoryTool, deleteRepositoryTool, createPullRequestTool, mergePullRequestTool, listPullRequestsTool, addIssueCommentTool, listIssuesTool, updateIssueTool, listCommitsTool, getFileTreeTool } from "../tools/github";
import { cloneRepositoryTool, readInMemoryFileTool, listInMemoryFilesTool, getInMemoryFileStatsTool, commitInMemoryChangesTool, getInMemoryLogTool, checkoutInMemoryBranchTool, createInMemoryBranchTool, diffInMemoryFilesTool } from "../tools/local_git";
import { extractTextFromUrlTool, extractHtmlFromUrlTool, extractElementsBySelectorTool, crawlWebsiteTool } from "../tools/web_scraping.js";



// Define the tools for the agent to use
const agentTools = [
  tavilyTool,
  evaluateExpressionTool, addNumbersTool, subtractNumbersTool, multiplyNumbersTool, divideNumbersTool, powerTool, sqrtTool, sinTool, cosTool, tanTool, logTool, absTool, roundTool, floorTool, ceilTool,
  listRepositoriesTool, getFileContentTool, createIssueTool, createRepositoryTool, deleteRepositoryTool, createPullRequestTool, mergePullRequestTool, listPullRequestsTool, addIssueCommentTool, listIssuesTool, updateIssueTool, listCommitsTool, getFileTreeTool,
  cloneRepositoryTool, readInMemoryFileTool, listInMemoryFilesTool, getInMemoryFileStatsTool, commitInMemoryChangesTool, getInMemoryLogTool, checkoutInMemoryBranchTool, createInMemoryBranchTool, diffInMemoryFilesTool,
  extractTextFromUrlTool, extractHtmlFromUrlTool, extractElementsBySelectorTool, crawlWebsiteTool,
];

const toolNode = new ToolNode(agentTools);

// Initialize memory to persist state between graph runs
const agentCheckpointer = new MemorySaver();

/**
 * Defines the core logic for the ReAct agent.
 * @param {MessagesState} state - The current state of the messages.
 * @returns {Promise<Partial<MessagesState>>} The updated state with the agent's response.
 */
async function reactAgentNode(state: MessagesState): Promise<Partial<MessagesState>> {
  try {
    const lastMessage = state.messages[state.messages.length - 1];
    const response = await model.invoke([lastMessage]);
    return { messages: [response] };
  } catch (error: any) {
    console.error("Error in ReAct agent node LLM invocation:", error);
    return { messages: [new AIMessage(`Error: ${error.message}`)] };
  }
}

/**
 * Determines the next action for the ReAct agent (continue, use tool, or handoff).
 * @param {MessagesState} state - The current state of the messages.
 * @returns {Promise<string>} The name of the next node to execute.
 */
async function reactAgentRouter(state: MessagesState): Promise<string> {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  // If the LLM decided to call a tool, execute it
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }

  // Otherwise, decide if the ReAct agent should continue, handoff, or end
  const availableTools = agentTools.map(tool => tool.name).join(", ");
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a router for the ReAct agent. Based on the conversation history and the available tools (${availableTools}), decide if the ReAct agent should:
    - 'continue': if the current response is not sufficient and more reasoning/tool use is needed.
    - 'end': if the task is complete and a final answer has been provided.
    - 'rag': if the query is better suited for the RAG agent.
    - 'conversational': if the query is better suited for the conversational agent.
    - 'research': if the query is better suited for the research agent.
    Respond with 'continue', 'end', 'rag', 'conversational', or 'research'.`],
    ["human", "{input}"],
  ]);

  try {
    const response = await model.invoke(
      await prompt.formatMessages({ input: state.messages.map(msg => msg.content).join("\n") })
    );
    const decision = response.content as string;

    if (["rag", "conversational", "research"].includes(decision)) {
      return decision; // Handoff to another agent
    } else if (decision === "end") {
      return END; // Task complete, end the ReAct workflow
    }
    return "agent"; // Continue the ReAct loop
  } catch (error: any) {
    console.error("Error in ReAct agent router LLM invocation:", error);
    return "agent"; // Default to continue if router fails
  }
}

/**
 * Defines the ReAct agent workflow.
 * @type {StateGraph<MessagesState>}
 */
const reactWorkflowBuilder = new StateGraph<MessagesState>({
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

reactWorkflowBuilder.addNode("agent", reactAgentNode);
reactWorkflowBuilder.addNode("tools", toolNode);

reactWorkflowBuilder.addEdge("agent", "reactAgentRouter");
reactWorkflowBuilder.addConditionalEdges("reactAgentRouter", reactAgentRouter, {
  agent: "agent", // Continue the ReAct loop
  rag: END, // Handoff to RAG agent (ends this subgraph)
  conversational: END, // Handoff to Conversational agent (ends this subgraph)
  research: END, // Handoff to Research agent (ends this subgraph)
  end: END, // Explicitly end the ReAct workflow
});
reactWorkflowBuilder.addEdge("tools", "agent"); // After tool execution, loop back to agent for further reasoning
reactWorkflowBuilder.setEntryPoint("agent");

export const reactAgent = reactWorkflowBuilder.compile();