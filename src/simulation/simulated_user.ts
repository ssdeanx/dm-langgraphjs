
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";

const model = new ChatGoogleGenerativeAI({ temperature: 0 });

/**
 * Creates a simulated user agent for chatbot evaluation.
 * @param {string} instructions - Specific instructions for the simulated user's persona and goals.
 * @returns {Promise<Runnable<BaseMessage[], AIMessage>>} A runnable simulated user agent.
 */
export async function createSimulatedUser(instructions: string): Promise<Runnable<BaseMessage[], AIMessage>> {
  const systemPromptTemplate = `You are a customer. You are interacting with a user who is a customer support person. Your goal is to achieve the following: {instructions}. If you have nothing more to add to the conversation, you must respond only with a single word: "FINISHED"`;
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPromptTemplate],
    ["placeholder", "{messages}"],
  ]);

  const partialPrompt = await prompt.partial({ instructions });
  const simulatedUser = partialPrompt.pipe(model);
  return simulatedUser;
}
