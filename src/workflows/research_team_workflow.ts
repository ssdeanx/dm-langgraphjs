
import { StateGraph, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesState } from "../agent/state";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { extractTextFromUrlTool, crawlWebsiteTool } from "../tools/web_scraping";

const model = new ChatGoogleGenerativeAI({ temperature: 0 });

const researchTools = [new TavilySearchResults({ maxResults: 5 }), extractTextFromUrlTool, crawlWebsiteTool];

/**
 * Helper function to create a specialized agent for the research team.
 * @param {object} params - Parameters for creating the agent.
 * @param {ChatGoogleGenerativeAI} params.llm - The language model to use.
 * @param {any[]} params.tools - The tools available to the agent.
 * @param {string} params.systemMessage - The system message for the agent.
 * @returns {Function} An agent function.
 */
async function createResearchAgent({ llm, tools, systemMessage }: { llm: ChatGoogleGenerativeAI; tools: any[]; systemMessage: string; }) {
  const toolNames = tools.map((tool) => tool.name).join(", ");
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a helpful AI assistant, part of a research team. ${systemMessage} You have access to the following tools: ${toolNames}.`],
    ["human", "{input}"],
  ]);
  return prompt.pipe(llm.bind({ tools }));
}

// Specialized Agents for Research Team
const researcherAgent = await createResearchAgent({
  llm: model,
  tools: [new TavilySearchResults({ maxResults: 5 })],
  systemMessage: "You are a research assistant. Use the tavily_search_results_json tool to gather information.",
});

const scraperAgent = await createResearchAgent({
  llm: model,
  tools: [extractTextFromUrlTool, crawlWebsiteTool],
  systemMessage: "You are a web scraping assistant. Use the extract_text_from_url or crawl_website tools to get content from web pages.",
});

/**
 * Node for the Researcher Agent's turn.
 * @param {MessagesState} state - The current state of the workflow.
 * @returns {Promise<Partial<MessagesState>>} The updated state with the researcher's response.
 */
async function researcherNode(state: MessagesState): Promise<Partial<MessagesState>> {
  const response = await researcherAgent.invoke({ messages: state.messages });
  return { messages: [new AIMessage({ content: response.content, name: "researcher" })] };
}

/**
 * Node for the Scraper Agent's turn.
 * @param {MessagesState} state - The current state of the workflow.
 * @returns {Promise<Partial<MessagesState>>} The updated state with the scraper's response.
 */
async function scraperNode(state: MessagesState): Promise<Partial<MessagesState>> {
  const response = await scraperAgent.invoke({ messages: state.messages });
  return { messages: [new AIMessage({ content: response.content, name: "scraper" })] };
}

/**
 * Determines the next agent in the research team or ends the workflow.
 * @param {MessagesState} state - The current state of the workflow.
 * @returns {string} The name of the next node to execute or END.
 */
function researchTeamRouter(state: MessagesState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  // Example: If the researcher needs web content, route to scraper
  if (lastMessage.content.includes("web content")) {
    return "scraper";
  }
  return END; // Otherwise, research is done
}

/**
 * Defines the Research Team workflow.
 * @type {StateGraph<MessagesState>}
 */
const researchTeamWorkflowBuilder = new StateGraph<MessagesState>({
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

researchTeamWorkflowBuilder.addNode("researcher", researcherNode);
researchTeamWorkflowBuilder.addNode("scraper", scraperNode);

researchTeamWorkflowBuilder.addEdge("researcher", "researchTeamRouter");
researchTeamWorkflowBuilder.addConditionalEdges("researchTeamRouter", researchTeamRouter, {
  scraper: "scraper",
  __end__: END,
});
researchTeamWorkflowBuilder.addEdge("scraper", END);

researchTeamWorkflowBuilder.setEntryPoint("researcher");

export const researchTeamWorkflow = researchTeamWorkflowBuilder.compile();
