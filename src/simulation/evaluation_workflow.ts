import { StateGraph, END, Annotation, START } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { createSimulatedUser } from "./simulated_user.js";
import { graph as chatBotGraph } from "../agent/graph.js"; // Import your main chatbot graph

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
  const response = await simulatedUser.invoke(state.messages);
  // Ensure content is a string for HumanMessage
  const content = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);
  return { messages: [new HumanMessage(content)] };
}

/**
 * Node for the chatbot's turn.
 * @param {EvaluationState} state - The current state of the evaluation workflow.
 * @returns {Promise<Partial<EvaluationState>>} The updated state with the chatbot's response.
 */
async function chatBotNode(state: EvaluationState): Promise<Partial<EvaluationState>> {
  // Invoke your main chatbot graph here
  const response = await chatBotGraph.invoke({ messages: state.messages });
  const content = response.messages[response.messages.length - 1].content;
  // Ensure content is a string for AIMessage
  const messageContent = typeof content === "string"
    ? content
    : JSON.stringify(content);
  return { messages: [new AIMessage(messageContent)] };
}

/**
 * Determines whether the simulation should continue or end.
 * @param {EvaluationState} state - The current state of the evaluation workflow.
 * @returns {string} The name of the next node or END.
 */
function shouldContinue(state: EvaluationState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const content = typeof lastMessage.content === "string"
    ? lastMessage.content
    : JSON.stringify(lastMessage.content);
  if (content.includes("FINISHED")) {
    return END;
  }
  // Alternate turns between user and chatbot
  if (lastMessage instanceof HumanMessage) {
    return "chatbot";
  }
  return "user";
}

const EvaluationStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

const evaluationWorkflowBuilder = new StateGraph(EvaluationStateAnnotation);

evaluationWorkflowBuilder.addNode("user", userNode);
evaluationWorkflowBuilder.addNode("chatbot", chatBotNode);

evaluationWorkflowBuilder.addConditionalEdges(
  "chatbot" as any,
  shouldContinue,
  {
    user: "user",
    [END]: END,
  } as any // <-- Cast to any to satisfy TypeScript
);
evaluationWorkflowBuilder.addEdge("user" as any, "chatbot" as any);

evaluationWorkflowBuilder.addEdge(START, "user" as any);

export const evaluationWorkflow = evaluationWorkflowBuilder.compile();
