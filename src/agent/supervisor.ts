
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseMessage } from "@langchain/core/messages";

const model = new ChatGoogleGenerativeAI({ temperature: 0 });

const supervisorPrompt = `You are a supervisor who needs to decide which agent to call next.

Given the following user request, respond with either "react", "rag", or "conversational" to route to the correct agent.

User Request: {input}`;

export async function supervisor(state: { messages: BaseMessage[] }) {
  const lastMessage = state.messages[state.messages.length - 1];
  const response = await model.invoke(
    supervisorPrompt.replace("{input}", lastMessage.content as string)
  );
  return {
    next: response.content as string,
  };
}
