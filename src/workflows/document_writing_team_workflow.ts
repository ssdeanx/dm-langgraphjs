
import { StateGraph, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesState } from "../agent/state";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { readInMemoryFileTool, cloneRepositoryTool } from "../tools/local_git";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const model = new ChatGoogleGenerativeAI({ temperature: 0 });

// Define a simple tool for writing content to a file (in-memory for now)
const writeDocumentTool = tool(
  async ({ fileName, content }) => {
    // In a real scenario, this would write to a persistent file system
    // For now, we'll just return a confirmation message
    return `Content written to ${fileName} (in-memory).`;
  },
  {
    name: "write_document",
    description: "Writes content to a specified document file.",
    schema: z.object({
      fileName: z.string().describe("The name of the document file."),
      content: z.string().describe("The content to write to the file."),
    }),
  }
);

/**
 * Helper function to create a specialized agent for the document writing team.
 * @param {object} params - Parameters for creating the agent.
 * @param {ChatGoogleGenerativeAI} params.llm - The language model to use.
 * @param {any[]} params.tools - The tools available to the agent.
 * @param {string} params.systemMessage - The system message for the agent.
 * @returns {Function} An agent function.
 */
async function createDocumentAgent({ llm, tools, systemMessage }: { llm: ChatGoogleGenerativeAI; tools: any[]; systemMessage: string; }) {
  const toolNames = tools.map((tool) => tool.name).join(", ");
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a helpful AI assistant, part of a document writing team. ${systemMessage} You have access to the following tools: ${toolNames}.`],
    ["human", "{input}"],
  ]);
  return prompt.pipe(llm.bind({ tools }));
}

// Specialized Agents for Document Writing Team
const writerAgent = await createDocumentAgent({
  llm: model,
  tools: [writeDocumentTool],
  systemMessage: "You are a content writer. Use the write_document tool to create and save documents.",
});

const fileManagerAgent = await createDocumentAgent({
  llm: model,
  tools: [readInMemoryFileTool, cloneRepositoryTool],
  systemMessage: "You are a file manager. Use the clone_repository and read_in_memory_file tools to manage files.",
});

/**
 * Node for the Writer Agent's turn.
 * @param {MessagesState} state - The current state of the workflow.
 * @returns {Promise<Partial<MessagesState>>} The updated state with the writer's response.
 */
async function writerNode(state: MessagesState): Promise<Partial<MessagesState>> {
  const response = await writerAgent.invoke({ messages: state.messages });
  return { messages: [new AIMessage({ content: response.content, name: "writer" })] };
}

/**
 * Node for the File Manager Agent's turn.
 * @param {MessagesState} state - The current state of the workflow.
 * @returns {Promise<Partial<MessagesState>>} The updated state with the file manager's response.
 */
async function fileManagerNode(state: MessagesState): Promise<Partial<MessagesState>> {
  const response = await fileManagerAgent.invoke({ messages: state.messages });
  return { messages: [new AIMessage({ content: response.content, name: "file_manager" })] };
}

/**
 * Determines the next agent in the document writing team or ends the workflow.
 * @param {MessagesState} state - The current state of the workflow.
 * @returns {string} The name of the next node to execute or END.
 */
function documentWritingTeamRouter(state: MessagesState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  // Example: If the writer needs file operations, route to file manager
  if (lastMessage.content.includes("file operation")) {
    return "file_manager";
  }
  return END; // Otherwise, document writing is done
}

/**
 * Defines the Document Writing Team workflow.
 * @type {StateGraph<MessagesState>}
 */
const documentWritingTeamWorkflowBuilder = new StateGraph<MessagesState>({
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

documentWritingTeamWorkflowBuilder.addNode("writer", writerNode);
documentWritingTeamWorkflowBuilder.addNode("file_manager", fileManagerNode);

documentWritingTeamWorkflowBuilder.addEdge("writer", "documentWritingTeamRouter");
documentWritingTeamWorkflowBuilder.addConditionalEdges("documentWritingTeamRouter", documentWritingTeamRouter, {
  file_manager: "file_manager",
  __end__: END,
});
documentWritingTeamWorkflowBuilder.addEdge("file_manager", END);

documentWritingTeamWorkflowBuilder.setEntryPoint("writer");

export const documentWritingTeamWorkflow = documentWritingTeamWorkflowBuilder.compile();
