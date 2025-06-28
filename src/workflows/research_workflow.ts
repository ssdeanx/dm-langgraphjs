import { StateGraph, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ResearchState } from "../agent/research_state";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ToolNode } from "@langchain/langgraph/prebuilt";

// Import all research-related tools
import { getFileContentTool } from "../tools/github";
import { readInMemoryFileTool } from "../tools/local_git";
import { extractTextFromUrlTool, crawlWebsiteTool } from "../tools/web_scraping";

const model = new ChatGoogleGenerativeAI({ temperature: 0 });

// Consolidated list of research tools
const researchTools = [
  new TavilySearchResults({ maxResults: 5 }),
  getFileContentTool,
  readInMemoryFileTool,
  extractTextFromUrlTool,
  crawlWebsiteTool,
];

const researchToolNode = new ToolNode(researchTools);

/**
 * Node for performing research using available tools.
 * This acts as a mini-agent within the research workflow.
 * @param {ResearchState} state - The current state of the research workflow.
 * @returns {Promise<Partial<ResearchState>>} The updated state with research data.
 */
async function researcherAgentNode(state: ResearchState): Promise<Partial<ResearchState>> {
  try {
    const lastMessage = state.messages[state.messages.length - 1];
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are a research assistant. Use the provided tools to answer the user's query. Available tools: ${researchTools.map(t => t.name).join(", ")}`],
      ["human", `{query}`],
    ]);
    const response = await model.invoke(await prompt.formatMessages({ query: state.query }));

    // If the LLM decides to call a tool, execute it
    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolOutput = await researchToolNode.invoke(response);
      return { research_data: [JSON.stringify(toolOutput)], messages: state.messages.concat(new AIMessage(response.content as string)) };
    } else {
      // If no tool call, the LLM directly answered
      return { research_data: [response.content as string], messages: state.messages.concat(new AIMessage(response.content as string)) };
    }
  } catch (error: any) {
    console.error("Error in researcher agent node:", error);
    return { messages: state.messages.concat(new AIMessage(`Error during research: ${error.message}`)) };
  }
}

/**
 * Node for summarizing the collected research data.
 * @param {ResearchState} state - The current state of the research workflow.
 * @returns {Promise<Partial<ResearchState>>} The updated state with the summary.
 */
async function summarizerNode(state: ResearchState): Promise<Partial<ResearchState>> {
  const researchData = state.research_data.join("\n\n");
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a summarization expert. Summarize the following research data concisely."],
    ["human", `{researchData}`],
  ]);
  try {
    const response = await model.invoke(await prompt.formatMessages({ researchData }));
    return { summary: response.content as string };
  } catch (error: any) {
    console.error("Error in summarizer node:", error);
    return { messages: state.messages.concat(new AIMessage(`Error summarizing: ${error.message}`)) };
  }
}

/**
 * Node for generating the final report based on the summary.
 * @param {ResearchState} state - The current state of the research workflow.
 * @returns {Promise<Partial<ResearchState>>} The updated state with the final report.
 */
async function reporterNode(state: ResearchState): Promise<Partial<ResearchState>> {
  const summary = state.summary;
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a report writer. Generate a comprehensive report based on the following summary."],
    ["human", `{summary}`],
  ]);
  try {
    const response = await model.invoke(await prompt.formatMessages({ summary }));
    return { report: response.content as string, messages: state.messages.concat(new AIMessage(response.content as string)) };
  } catch (error: any) {
    console.error("Error in reporter node:", error);
    return { messages: state.messages.concat(new AIMessage(`Error reporting: ${error.message}`)) };
  }
}

/**
 * Defines the research and reporting workflow.
 * @type {StateGraph<ResearchState>}
 */
const researchWorkflowBuilder = new StateGraph<ResearchState>({
  channels: {
    query: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    messages: {
      value: (x, y) => x.concat(y),
      default: () => [],
    },
    research_data: {
      value: (x, y) => x.concat(y),
      reducer: (x, y) => x.concat(y), // Ensure reducer for fan-in
      default: () => [],
    },
    summary: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    report: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    next: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
  },
});

researchWorkflowBuilder.addNode("researcher", researcherAgentNode);
researchWorkflowBuilder.addNode("summarizer", summarizerNode, { defer: true }); // Defer execution
researchWorkflowBuilder.addNode("reporter", reporterNode);

researchWorkflowBuilder.addEdge("researcher", "summarizer");
researchWorkflowBuilder.addEdge("summarizer", "reporter");
researchWorkflowBuilder.addEdge("reporter", END);

researchWorkflowBuilder.setEntryPoint("researcher");

export const researchWorkflow = researchWorkflowBuilder.compile();