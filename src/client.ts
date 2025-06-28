import { Client } from "@langchain/langgraph-sdk";
import * as readline from "readline";
import { v4 as uuidv4 } from "uuid";
import { trace } from "langsmith/traceable";
import { createLogger, format, transports } from "winston";

const client = new Client({ apiUrl: "http://localhost:2024" });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Configure Winston logger for the client
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

async function main() {
  const threadId = uuidv4();
  logger.info(`Starting a new conversation with thread ID: ${threadId}`);
  logger.info("Try these examples:\n");
  logger.info("1. What is the weather in San Francisco and what is 2 + 2? (React Agent - web search and calculator)");
  logger.info("2. What is LangGraph and how does it help with multi-agent systems? (RAG Agent - querying project documentation)");
  logger.info("3. Tell me a joke. (Conversational Agent)");
  logger.info("4. List my repositories on GitHub. (React Agent - GitHubTool)");
  logger.info("5. Get the content of README.md from the langchain-ai/langgraphjs repository. (React Agent - GitHubTool)");
  logger.info("6. Create an issue titled 'Bug Report' with body 'The login button is not working.' in the langchain-ai/langgraphjs repository. (React Agent - GitHubTool)");
  logger.info("7. Parse the text from a PDF file located at /path/to/your/document.pdf. (RAG Agent - DocumentProcessingTool)");
  logger.info("8. Convert a DOCX file to text from /path/to/your/document.docx. (RAG Agent - DocumentProcessingTool)");
  logger.info("9. Parse CSV data from /path/to/your/data.csv. (RAG Agent - DocumentProcessingTool)");
  logger.info("10. Parse XML data from /path/to/your/data.xml. (RAG Agent - DocumentProcessingTool)");
  logger.info("11. Research the latest advancements in AI. (Research Agent - Research Workflow)");
  logger.info("12. Clone the langchain-ai/langgraphjs repository and read the content of /repo/README.md. (React Agent - LocalGitTool)");
  logger.info("13. Extract text from the URL https://www.google.com. (React Agent - WebScrapingTool)");
  logger.info("14. Crawl the website https://www.google.com for 2 pages. (React Agent - WebScrapingTool)");
  logger.info("15. Plan and execute a task: What is the capital of France and what is 10 * 5? (Rewoo Agent - Rewoo Workflow)");
  logger.info("16. Plan and execute: Find the current weather in London and then calculate 15 + 7. (Plan-and-Execute Workflow)");
  logger.info("17. What is LangGraph? (Self-RAG Workflow)");
  logger.info("18. Remember that my favorite color is blue. (Conversational Agent - Semantic Search Memory)");
  logger.info("19. What is my favorite color? (Conversational Agent - Semantic Search Memory)");
  logger.info("20. What is LangChain? (CRAG Workflow)");
  logger.info("21. Research the history of AI and then summarize it. (Collaboration Workflow)");
  logger.info("22. Research the latest AI models and write a summary. (Hierarchical Agent Teams - Research Team)");
  logger.info("23. Write a document about the benefits of AI and save it as ai_benefits.txt. (Hierarchical Agent Teams - Document Writing Team)");
  logger.info("24. Write a 5-paragraph essay on the importance of clean energy. (Reflection Workflow)");
  logger.info("\nType 'exit' to end the conversation.\n");

  while (true) {
    const userInput = await new Promise<string>((resolve) => {
      rl.question("You: ", (input) => resolve(input));
    });

    if (userInput.toLowerCase() === "exit") {
      rl.close();
      break;
    }

    logger.info(`\nUser Input: ${userInput}`);
    logger.info("Agent Response:");

    const streamResponse = client.runs.stream(
      threadId,
      "agent",
      {
        input: {
          messages: [
            {
              role: "user",
              content: userInput,
            },
          ],
        },
        streamMode: "messages",
      }
    );

    for await (const chunk of streamResponse) {
        if (chunk.event === "messages/partial") {
            const content = chunk.data?.[0]?.content;
            if (content) {
                process.stdout.write(String(content));
            }
        } else if (chunk.event === "metadata") {
            const metadataEvent = chunk as { event: string; data: any; metadata: { name: string } };
            if (metadataEvent.metadata.name === "tool_start") {
                logger.info(`\nTool Start: ${metadataEvent.metadata.name}`);
                logger.info(`Tool Input: ${JSON.stringify(metadataEvent.data.input, null, 2)}`);
            } else if (metadataEvent.metadata.name === "tool_end") {
                logger.info(`Tool End: ${metadataEvent.metadata.name}`);
                logger.info(`Tool Output: ${JSON.stringify(metadataEvent.data.output, null, 2)}`);
            } else if (metadataEvent.metadata.name === "llm_end") {
                // This event signifies the end of an LLM call, useful for debugging
                // logger.debug(`LLM End: ${JSON.stringify(metadataEvent.data, null, 2)}`);
            }
        }
    }
    logger.info("\n");
  }
}

main();

