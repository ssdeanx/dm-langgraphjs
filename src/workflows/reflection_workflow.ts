
import { StateGraph, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ReflectionState } from "../agent/reflection_state";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const model = new ChatGoogleGenerativeAI({ temperature: 0 });

/**
 * Node for generating initial content.
 * @param {ReflectionState} state - The current state of the workflow.
 * @returns {Promise<Partial<ReflectionState>>} The updated state with the generated content.
 */
async function generatorNode(state: ReflectionState): Promise<Partial<ReflectionState>> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are an essay assistant tasked with writing excellent 5-paragraph essays. Generate the best essay possible for the user's request."],
    ["human", `{request}`],
  ]);
  const response = await model.invoke(await prompt.formatMessages({ request: state.request }));
  return { content: response.content as string, messages: state.messages.concat(new AIMessage(response.content as string)) };
}

/**
 * Node for critiquing the generated content.
 * @param {ReflectionState} state - The current state of the workflow.
 * @returns {Promise<Partial<ReflectionState>>} The updated state with the critique.
 */
async function reflectorNode(state: ReflectionState): Promise<Partial<ReflectionState>> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a teacher grading an essay submission. Generate critique and recommendations for the user's submission. Provide detailed recommendations."],
    ["human", `Essay: {content}`],
  ]);
  const response = await model.invoke(await prompt.formatMessages({ content: state.content }));
  return { critique: response.content as string };
}

/**
 * Node for revising the content based on the critique.
 * @param {ReflectionState} state - The current state of the workflow.
 * @returns {Promise<Partial<ReflectionState>>} The updated state with the revised content.
 */
async function reviserNode(state: ReflectionState): Promise<Partial<ReflectionState>> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are an essay assistant. Revise the following essay based on the critique provided."],
    ["human", `Essay: {content}\nCritique: {critique}`],
  ]);
  const response = await model.invoke(await prompt.formatMessages({ content: state.content, critique: state.critique }));
  return { content: response.content as string, messages: state.messages.concat(new AIMessage(response.content as string)) };
}

/**
 * Defines the Reflection workflow.
 * @type {StateGraph<ReflectionState>}
 */
const reflectionWorkflowBuilder = new StateGraph<ReflectionState>({
  channels: {
    request: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    content: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    critique: {
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

reflectionWorkflowBuilder.addNode("generator", generatorNode);
reflectionWorkflowBuilder.addNode("reflector", reflectorNode);
reflectionWorkflowBuilder.addNode("reviser", reviserNode);

reflectionWorkflowBuilder.addEdge("generator", "reflector");
reflectionWorkflowBuilder.addEdge("reflector", "reviser");
reflectionWorkflowBuilder.addEdge("reviser", END);

reflectionWorkflowBuilder.setEntryPoint("generator");

export const reflectionWorkflow = reflectionWorkflowBuilder.compile();
