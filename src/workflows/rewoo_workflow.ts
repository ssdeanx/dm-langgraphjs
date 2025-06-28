import { StateGraph, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RewooState } from "../agent/rewoo_state";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

// Import all tools
import { tavilyTool } from "../tools/tavily";
import { evaluateExpressionTool, addNumbersTool, subtractNumbersTool, multiplyNumbersTool, divideNumbersTool, powerTool, sqrtTool, sinTool, cosTool, tanTool, logTool, absTool, roundTool, floorTool, ceilTool } from "../tools/calculator";
import { listRepositoriesTool, getFileContentTool, createIssueTool, createRepositoryTool, deleteRepositoryTool, createPullRequestTool, mergePullRequestTool, listPullRequestsTool, addIssueCommentTool, listIssuesTool, updateIssueTool, listCommitsTool, getFileTreeTool } from "../tools/github";
import { cloneRepositoryTool, readInMemoryFileTool, listInMemoryFilesTool, getInMemoryFileStatsTool, commitInMemoryChangesTool, getInMemoryLogTool, checkoutInMemoryBranchTool, createInMemoryBranchTool, diffInMemoryFilesTool } from "../tools/local_git";
import { extractTextFromUrlTool, extractHtmlFromUrlTool, extractElementsBySelectorTool, crawlWebsiteTool } from "../tools/web_scraping";
import { parsePdfTool, convertDocxToTextTool, parseCsvTool, parseXmlTool, extractTextFromFileTool } from "../tools/document_processing";

const model = new ChatGoogleGenerativeAI({ temperature: 0 });

// All available tools for the Worker to execute
const allTools = [
  tavilyTool,
  evaluateExpressionTool, addNumbersTool, subtractNumbersTool, multiplyNumbersTool, divideNumbersTool, powerTool, sqrtTool, sinTool, cosTool, tanTool, logTool, absTool, roundTool, floorTool, ceilTool,
  listRepositoriesTool, getFileContentTool, createIssueTool, createRepositoryTool, deleteRepositoryTool, createPullRequestTool, mergePullRequestTool, listPullRequestsTool, addIssueCommentTool, listIssuesTool, updateIssueTool, listCommitsTool, getFileTreeTool,
  cloneRepositoryTool, readInMemoryFileTool, listInMemoryFilesTool, getInMemoryFileStatsTool, commitInMemoryChangesTool, getInMemoryLogTool, checkoutInMemoryBranchTool, createInMemoryBranchTool, diffInMemoryFilesTool,
  extractTextFromUrlTool, extractHtmlFromUrlTool, extractElementsBySelectorTool, crawlWebsiteTool,
  parsePdfTool, convertDocxToTextTool, parseCsvTool, parseXmlTool, extractTextFromFileTool,
];

const rewooToolNode = new ToolNode(allTools);

/**
 * Defines the schema for the planner's structured output.
 */
const planSchema = z.object({
  plan: z.array(z.object({
    varName: z.string().regex(/^#E\d+$/).describe("Variable name for the tool output (e.g., #E1)."),
    toolName: z.string().describe("Name of the tool to call."),
    toolArgs: z.record(z.any()).describe("Arguments for the tool, as a JSON object."),
  })).describe("A list of steps, each defining a tool call."),
});

/**
 * Node for planning the steps of the Rewoo workflow.
 * @param {RewooState} state - The current state of the Rewoo workflow.
 * @returns {Promise<Partial<RewooState>>} The updated state with the generated plan.
 */
async function plannerNode(state: RewooState): Promise<Partial<RewooState>> {
  const plannerPrompt = ChatPromptTemplate.fromMessages([
    ["system", `For the following task, make plans that can solve the problem step by step. For each plan, indicate which external tool together with tool input to retrieve evidence. You must use the exact tool names and provide arguments as a JSON object.
    Tools can be one of the following:
    ${allTools.map(tool => `${tool.name}: ${tool.description}`).join("\n")}
    Important! Variables/results MUST be referenced using the # symbol (e.g., #E1). The plan will be executed as a program, so no coreference resolution apart from naive variable replacement is allowed. The ONLY way for steps to share context is through #E variables.
    Your response must be a JSON object conforming to the planSchema.`],
    ["human", `{task}`],
  ]);

  try {
    const response = await model.withStructuredOutput(planSchema).invoke(
      await plannerPrompt.formatMessages({ task: state.task })
    );
    const planString = JSON.stringify(response.plan);
    const steps = response.plan.map(step => [
      step.varName,
      step.toolName,
      JSON.stringify(step.toolArgs),
    ]);
    return { planString, steps };
  } catch (error: any) {
    console.error("Error in Rewoo planner node:", error);
    return { messages: state.messages.concat(new AIMessage(`Error planning: ${error.message}`)) };
  }
}

/**
 * Node for executing the tools defined in the plan.
 * @param {RewooState} state - The current state of the Rewoo workflow.
 * @returns {Promise<Partial<RewooState>>} The updated state with the results of tool executions.
 */
async function workerNode(state: RewooState): Promise<Partial<RewooState>> {
  const newResults: Record<string, any> = { ...state.results };

  for (const [varName, toolName, toolArgsString] of state.steps) {
    let processedArgsString = toolArgsString;
    // Perform variable substitution
    for (const key in newResults) {
      processedArgsString = processedArgsString.replace(new RegExp(`#${key}`, "g"), newResults[key]);
    }

    try {
      const toolCall = {
        tool_calls: [{
          id: uuidv4(), // Generate a unique ID for the tool call
          name: toolName,
          args: JSON.parse(processedArgsString),
        }],
      };
      const output = await rewooToolNode.invoke(toolCall);
      newResults[varName] = output;
    } catch (error: any) {
      console.error(`Error executing tool ${toolName} with args ${processedArgsString}:`, error);
      newResults[varName] = `Error: ${error.message}`;
    }
  }
  return { results: newResults };
}

/**
 * Node for generating the final answer based on tool observations.
 * @param {RewooState} state - The current state of the Rewoo workflow.
 * @returns {Promise<Partial<RewooState>>} The updated state with the final result.
 */
async function solverNode(state: RewooState): Promise<Partial<RewooState>> {
  const solverPrompt = ChatPromptTemplate.fromMessages([
    ["system", `Given the following task and tool results, provide a comprehensive answer.
    Task: {task}
    Tool Results: {results}`],
    ["human", `{task}`],
  ]);
  try {
    const response = await model.invoke(await solverPrompt.formatMessages({ task: state.task, results: JSON.stringify(state.results) }));
    return { result: response.content as string, messages: state.messages.concat(new AIMessage(response.content as string)) };
  } catch (error: any) {
    console.error("Error in Rewoo solver node:", error);
    return { messages: state.messages.concat(new AIMessage(`Error solving: ${error.message}`)) };
  }
}

/**
 * Defines the Rewoo workflow.
 * @type {StateGraph<RewooState>}
 */
const rewooWorkflowBuilder = new StateGraph<RewooState>({
  channels: {
    task: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    planString: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    steps: {
      value: (x, y) => y ?? x,
      default: () => [],
    },
    results: {
      value: (x, y) => ({ ...x, ...y }),
      default: () => ({}),
    },
    result: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    messages: {
      value: (x, y) => x.concat(y),
      default: () => [],
    },
    next: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
  },
});

rewooWorkflowBuilder.addNode("planner", plannerNode);
rewooWorkflowBuilder.addNode("worker", workerNode);
rewooWorkflowBuilder.addNode("solver", solverNode);

rewooWorkflowBuilder.addEdge("planner", "worker");
rewooWorkflowBuilder.addEdge("worker", "solver");
rewooWorkflowBuilder.addEdge("solver", END);

rewooWorkflowBuilder.setEntryPoint("planner");

export const rewooWorkflow = rewooWorkflowBuilder.compile();