import { StateGraph, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { PlanExecuteState } from "../agent/plan_execute_state";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";

// Import all tools
import { tavilyTool } from "../tools/tavily";
import { evaluateExpressionTool, addNumbersTool, subtractNumbersTool, multiplyNumbersTool, divideNumbersTool, powerTool, sqrtTool, sinTool, cosTool, tanTool, logTool, absTool, roundTool, floorTool, ceilTool } from "../tools/calculator";
import { listRepositoriesTool, getFileContentTool, createIssueTool, createRepositoryTool, deleteRepositoryTool, createPullRequestTool, mergePullRequestTool, listPullRequestsTool, addIssueCommentTool, listIssuesTool, updateIssueTool, listCommitsTool, getFileTreeTool } from "../tools/github";
import { cloneRepositoryTool, readInMemoryFileTool, listInMemoryFilesTool, getInMemoryFileStatsTool, commitInMemoryChangesTool, getInMemoryLogTool, checkoutInMemoryBranchTool, createInMemoryBranchTool, diffInMemoryFilesTool } from "../tools/local_git";
import { extractTextFromUrlTool, extractHtmlFromUrlTool, extractElementsBySelectorTool, crawlWebsiteTool } from "../tools/web_scraping";
import { parsePdfTool, convertDocxToTextTool, parseCsvTool, parseXmlTool, extractTextFromFileTool } from "../tools/document_processing";

const model = new ChatGoogleGenerativeAI({ temperature: 0 });

// All available tools for the Executor to execute
const allTools = [
  tavilyTool,
  evaluateExpressionTool, addNumbersTool, subtractNumbersTool, multiplyNumbersTool, divideNumbersTool, powerTool, sqrtTool, sinTool, cosTool, tanTool, logTool, absTool, roundTool, floorTool, ceilTool,
  listRepositoriesTool, getFileContentTool, createIssueTool, createRepositoryTool, deleteRepositoryTool, createPullRequestTool, mergePullRequestTool, listPullRequestsTool, addIssueCommentTool, listIssuesTool, updateIssueTool, listCommitsTool, getFileTreeTool,
  cloneRepositoryTool, readInMemoryFileTool, listInMemoryFilesTool, getInMemoryFileStatsTool, commitInMemoryChangesTool, getInMemoryLogTool, checkoutInMemoryBranchTool, createInMemoryBranchTool, diffInMemoryFilesTool,
  extractTextFromUrlTool, extractHtmlFromUrlTool, extractElementsBySelectorTool, crawlWebsiteTool,
  parsePdfTool, convertDocxToTextTool, parseCsvTool, parseXmlTool, extractTextFromFileTool,
];

const planExecuteToolNode = new ToolNode(allTools);

/**
 * Node for generating the plan.
 * @param {PlanExecuteState} state - The current state of the workflow.
 * @returns {Promise<Partial<PlanExecuteState>>} The updated state with the generated plan.
 */
async function plannerNode(state: PlanExecuteState): Promise<Partial<PlanExecuteState>> {
  const plannerPrompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful assistant. Given the user's request, create a concise, step-by-step plan to fulfill it. Each step should be a clear, actionable instruction."],
    ["human", `{input}`],
  ]);
  try {
    const response = await model.invoke(await plannerPrompt.formatMessages({ input: state.input }));
    const plan = (response.content as string).split("\n").filter(s => s.trim() !== "");
    return { plan };
  } catch (error: any) {
    console.error("Error in Plan-and-Execute planner node:", error);
    return { messages: state.messages.concat(new AIMessage(`Error planning: ${error.message}`)) };
  }
}

/**
 * Node for executing a single step of the plan.
 * This acts as a mini-agent within the Plan-and-Execute workflow.
 * @param {PlanExecuteState} state - The current state of the workflow.
 * @returns {Promise<Partial<PlanExecuteState>>} The updated state with the executed step and its result.
 */
async function executorNode(state: PlanExecuteState): Promise<Partial<PlanExecuteState>> {
  const currentStep = state.plan[0];
  const messages = state.messages.concat(new HumanMessage(currentStep));

  let stepResult: string;
  try {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are an executor agent. Execute the following step using the available tools. Available tools: ${allTools.map(t => t.name).join(", ")}`],
      ["human", `{step}`],
    ]);
    const response = await model.invoke(await prompt.formatMessages({ step: currentStep }));

    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolOutput = await planExecuteToolNode.invoke(response);
      stepResult = JSON.stringify(toolOutput);
    } else {
      stepResult = response.content as string;
    }
  } catch (error: any) {
    console.error("Error in Plan-and-Execute executor node:", error);
    stepResult = `Error executing step: ${error.message}`;
  }

  const pastSteps = state.pastSteps.concat([[currentStep, stepResult]]);
  const remainingPlan = state.plan.slice(1);

  return { pastSteps, plan: remainingPlan, messages: messages.concat(new AIMessage(stepResult)) };
}

/**
 * Node for deciding whether to continue, modify the plan, or conclude.
 * @param {PlanExecuteState} state - The current state of the workflow.
 * @returns {Promise<string>} The name of the next node to execute.
 */
async function revisitNode(state: PlanExecuteState): Promise<string> {
  if (state.plan.length === 0) {
    // All steps executed, generate final response
    return "final_response"; // Transition to a node that sets the final response
  }

  // Decide whether to continue with the next step or replan
  const decisionPrompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a plan reviser. Based on the original input, the remaining plan, and the results of the last executed step, decide whether to 'continue' to the next step, or 'replan' the remaining steps. If all steps are complete, respond with 'finish'."],
    ["human", `Original Input: ${state.input}\nRemaining Plan: ${state.plan.join("\n")}\nLast Step Result: ${state.pastSteps[state.pastSteps.length - 1][1]}`],
  ]);
  try {
    const response = await model.invoke(await decisionPrompt.formatMessages({ input: state.input, plan: state.plan, pastSteps: state.pastSteps }));
    const decision = response.content as string;

    if (decision.toLowerCase().includes("replan")) {
      return "planner"; // Go back to planner to generate a new plan
    }
    return "executor"; // Continue with the next step
  } catch (error: any) {
    console.error("Error in Plan-and-Execute revisit node:", error);
    return "executor"; // Default to continue if router fails
  }
}

/**
 * Node for setting the final response.
 * @param {PlanExecuteState} state - The current state of the workflow.
 * @returns {Promise<Partial<PlanExecuteState>>} The updated state with the final response.
 */
async function finalResponseNode(state: PlanExecuteState): Promise<Partial<PlanExecuteState>> {
  const finalPrompt = ChatPromptTemplate.fromMessages([
    ["system", "You have completed all steps in the plan. Based on the original input and the results of the executed steps, provide a comprehensive final response."],
    ["human", `Original Input: ${state.input}\nExecuted Steps and Results:\n${state.pastSteps.map(([step, result]) => `- ${step}: ${result}`).join("\n")}`],
  ]);
  try {
    const response = await model.invoke(await finalPrompt.formatMessages({ input: state.input, pastSteps: state.pastSteps }));
    return { response: response.content as string, messages: state.messages.concat(new AIMessage(response.content as string)) };
  } catch (error: any) {
    console.error("Error in Plan-and-Execute final response node:", error);
    return { messages: state.messages.concat(new AIMessage(`Error generating final response: ${error.message}`)) };
  }
}

/**
 * Defines the Plan-and-Execute workflow.
 * @type {StateGraph<PlanExecuteState>}
 */
const planExecuteWorkflowBuilder = new StateGraph<PlanExecuteState>({
  channels: {
    input: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    plan: {
      value: (x, y) => y ?? x,
      default: () => [],
    },
    pastSteps: {
      value: (x, y) => x.concat(y),
      default: () => [],
    },
    response: {
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

planExecuteWorkflowBuilder.addNode("planner", plannerNode);
planExecuteWorkflowBuilder.addNode("executor", executorNode);
planExecuteWorkflowBuilder.addNode("revisit", revisitNode);
planExecuteWorkflowBuilder.addNode("final_response", finalResponseNode);

planExecuteWorkflowBuilder.addEdge("planner", "executor");
planExecuteWorkflowBuilder.addEdge("executor", "revisit");
planExecuteWorkflowBuilder.addConditionalEdges("revisit", (state) => {
  if (state.plan.length === 0) {
    return "final_response";
  }
  const decision = (state.messages[state.messages.length - 1] as AIMessage).content as string; // Assuming decision is in the last message
  if (decision.toLowerCase().includes("replan")) {
    return "planner";
  }
  return "executor";
}, {
  executor: "executor",
  planner: "planner",
  final_response: "final_response",
});
planExecuteWorkflowBuilder.addEdge("final_response", END);

planExecuteWorkflowBuilder.setEntryPoint("planner");

export const planExecuteWorkflow = planExecuteWorkflowBuilder.compile();