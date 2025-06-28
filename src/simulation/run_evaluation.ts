
import { evaluationWorkflow } from "./evaluation_workflow";
import { HumanMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";
import { RunnableConfig } from "@langchain/core/runnables";
import { LangChainTracer } from "langsmith/traceable";
import { createLogger, format, transports } from "winston";

// Configure Winston logger for the evaluation script
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.colorize(),
    format.simple()
  ),
  transports: [
    new transports.Console(),
  ],
});

async function runEvaluation() {
  const threadId = uuidv4();
  logger.info(`Starting evaluation simulation with thread ID: ${threadId}`);

  const initialMessage = new HumanMessage("Hello, I'd like to inquire about a refund for my flight.");

  const stream = evaluationWorkflow.stream(
    { messages: [initialMessage] },
    {
      configurable: {
        thread_id: threadId,
      },
      callbacks: [new LangChainTracer()],
    }
  );

  for await (const chunk of stream) {
    logger.info(JSON.stringify(chunk, null, 2));
  }

  logger.info("Evaluation simulation finished.");
}

runEvaluation();
