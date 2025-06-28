import { graph } from "./agent/graph.js";
import { HumanMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";
import { RunnableConfig } from "@langchain/core/runnables";
import logger from "./config/logger.js";

async function main() {
  logger.info("Running multi-agent system example...");
  const threadId = uuidv4();
  const runConfig: RunnableConfig = {
    configurable: {
      thread_id: threadId,
    },
  };

  // Example 1: React Agent (web search and calculator)
  logger.info("\n--- Example 1: React Agent (web search and calculator) ---");
  let stream = await graph.stream(
    {
      messages: [
        new HumanMessage(
          "What is the weather in San Francisco and what is 2 + 2?"
        ),
      ],
    },
    {
      ...runConfig,
      streamMode: "values",
    }
  );

  for await (const chunk of stream) {
    console.log(chunk);
  }

  // Example 2: RAG Agent (querying project documentation)
  logger.info("\n--- Example 2: RAG Agent (querying project documentation) ---");
  stream = await graph.stream(
    {
      messages: [
        new HumanMessage(
          "What is LangGraph and how does it help with multi-agent systems?"
        ),
      ],
    },
    {
      ...runConfig,
      streamMode: "values",
    }
  );

  for await (const chunk of stream) {
    console.log(chunk);
  }

  // Example 3: Conversational Agent
  logger.info("\n--- Example 3: Conversational Agent ---");
  stream = await graph.stream(
    {
      messages: [
        new HumanMessage("Tell me a joke."),
      ],
    },
    {
      ...runConfig,
      streamMode: "values",
    }
  );

  for await (const chunk of stream) {
    console.log(chunk);
  }
}

main();