import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesState } from "./state";
import { BaseMessage, AIMessage } from "@langchain/core/messages";
import { putMemoryTool, searchMemoryTool } from "../tools/memory";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, END } from "@langchain/langgraph";

const model = new ChatGoogleGenerativeAI({ temperature: 0 });

const conversationalTools = [putMemoryTool, searchMemoryTool];
const conversationalToolNode = new ToolNode(conversationalTools);

/**
 * Defines the core logic for the conversational agent.
 * @param {MessagesState} state - The current state of the messages.
 * @returns {Promise<Partial<MessagesState>>} The updated state with the agent's response.
 */
async function conversationalAgentNode(state: MessagesState): Promise<Partial<MessagesState>> {
  try {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful and friendly AI assistant. You can store and retrieve information from memory. Respond to the user's query in a conversational manner. If the user asks you to remember something, use the 'put_memory' tool. If the user asks you about something you might have remembered, use the 'search_memory' tool."],
      ["human", "{input}"],
    ]);
    const lastMessage = state.messages[state.messages.length - 1];
    const response = await model.invoke(
      await prompt.formatMessages({ input: lastMessage.content as string })
    );
    return { messages: [response] };
  } catch (error: any) {
    console.error("Error in conversational agent node LLM invocation:", error);
    return { messages: [new AIMessage(`Error: ${error.message}`)] };
  }
}

/**
 * Determines the next action for the conversational agent (continue, use tool, or handoff).
 * @param {MessagesState} state - The current state of the messages.
 * @returns {Promise<string>} The name of the next node to execute.
 */
async function conversationalAgentRouter(state: MessagesState): Promise<string> {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  // If the LLM decided to call a tool, execute it
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }

  // Otherwise, decide if the conversational agent should end or handoff
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a router for the conversational agent. Based on the conversation history, decide if the conversational agent should 'end' (if the conversation is naturally concluded), or handoff to another agent (react, rag, research, rewoo, plan_execute, self_rag, crag). Respond with 'end', 'react', 'rag', 'research', 'rewoo', 'plan_execute', 'self_rag', or 'crag'."],
    ["human", "{input}"],
  ]);

  try {
    const response = await model.invoke(
      await prompt.formatMessages({ input: state.messages.map(msg => msg.content).join("\n") })
    );
    const decision = response.content as string;

    if (["react", "rag", "research", "rewoo", "plan_execute", "self_rag", "crag"].includes(decision)) {
      return decision; // Handoff to another agent
    } else if (decision === "end") {
      return END; // Conversation complete, end the conversational workflow
    }
    return END; // Default to end if router fails or no clear decision
  } catch (error: any) {
    console.error("Error in conversational agent router LLM invocation:", error);
    return END; // Default to end if router fails
  }
}

/**
 * Defines the conversational agent workflow.
 * @type {StateGraph<MessagesState>}
 */
const conversationalWorkflowBuilder = new StateGraph<MessagesState>({
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

conversationalWorkflowBuilder.addNode("agent", conversationalAgentNode);
conversationalWorkflowBuilder.addNode("tools", conversationalToolNode);

conversationalWorkflowBuilder.addEdge("agent", "conversationalAgentRouter");
conversationalWorkflowBuilder.addConditionalEdges("conversationalAgentRouter", conversationalAgentRouter, {
  tools: "tools",
  react: END,
  rag: END,
  research: END,
  rewoo: END,
  plan_execute: END,
  self_rag: END,
  crag: END,
  __end__: END, // Explicitly end the conversational workflow
});
conversationalWorkflowBuilder.addEdge("tools", "agent");
conversationalWorkflowBuilder.setEntryPoint("agent");

export const conversationalAgent = conversationalWorkflowBuilder.compile();