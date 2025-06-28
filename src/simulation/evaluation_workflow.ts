
import { StateGraph, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { createSimulatedUser } from "./simulated_user";
import { graph as chatBotGraph } from "../agent/graph"; // Import your main chatbot graph

/**
 * Defines the state for the chatbot evaluation workflow.
 * @interface
 */
interface EvaluationState {
  messages: BaseMessage[];
}

/**
 * Node for the simulated user's turn.
 * @param {EvaluationState} state - The current state of the evaluation workflow.
 * @returns {Promise<Partial<EvaluationState>>} The updated state with the simulated user's message.
 */
async function userNode(state: EvaluationState): Promise<Partial<EvaluationState>> {
  const simulatedUser = await createSimulatedUser("You are a customer trying to get a refund for a trip taken 5 years ago. Be extremely persistent.");
  const response = await simulatedUser.invoke({ messages: state.messages });
  return { messages: [new HumanMessage(response.content)] };
}

/**
 * Node for the chatbot's turn.
 * @param {EvaluationState} state - The current state of the evaluation workflow.
 * @returns {Promise<Partial<EvaluationState>>} The updated state with the chatbot's response.
 */
async function chatBotNode(state: EvaluationState): Promise<Partial<EvaluationState>> {
  // Invoke your main chatbot graph here
  const response = await chatBotGraph.invoke({ messages: state.messages });
  return { messages: [new AIMessage(response.messages[response.messages.length - 1].content)] };
}

/**
 * Determines whether the simulation should continue or end.
 * @param {EvaluationState} state - The current state of the evaluation workflow.
 * @returns {string} The name of the next node or END.
 */
function shouldContinue(state: EvaluationState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.content.includes("FINISHED")) {
    return END;
  }
  // Alternate turns between user and chatbot
  if (lastMessage instanceof HumanMessage) {
    return "chatbot";
  }
  return "user";
}

/**
 * Defines the chatbot evaluation workflow.
 * @type {StateGraph<EvaluationState>}
 */
const evaluationWorkflowBuilder = new StateGraph<EvaluationState>({
  channels: {
    messages: {
      value: (x, y) => x.concat(y),
      default: () => [],
    },
  },
});

evaluationWorkflowBuilder.addNode("user", userNode);
evaluationWorkflowBuilder.addNode("chatbot", chatBotNode);

evaluationWorkflowBuilder.addEdge("user", "chatbot");
evaluationWorkflowBuilder.addEdge("chatbot", "user");

evaluationWorkflowBuilder.setEntryPoint("user");

export const evaluationWorkflow = evaluationWorkflowBuilder.compile();
