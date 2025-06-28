How to wait for user input (Functional API)

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to wait for user input (Functional API)¶

Prerequisites

This guide assumes familiarity with the following:

* Implementing human-in-the-loop workflows with interrupt
* How to create a ReAct agent using the Functional API

Human-in-the-loop (HIL) interactions are crucial for agentic systems. Waiting for human input is a common HIL interaction pattern, allowing the agent to ask the user clarifying questions and await input before proceeding.

We can implement this in LangGraph using the interrupt() function. interrupt allows us to stop graph execution to collect input from a user and continue execution with collected input.

This guide demonstrates how to implement human-in-the-loop workflows using LangGraph's Functional API. Specifically, we will demonstrate:

1. A simple usage example
2. How to use with a ReAct agent

## Setup¶

Note

This guide requires @langchain/langgraph>=0.2.42.

First, install the required dependencies for this example:

```
npm install @langchain/langgraph @langchain/openai @langchain/core zod
```

Next, we need to set API keys for OpenAI (the LLM we will use):

```
process.env.OPENAI_API_KEY = "YOUR_API_KEY";
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here

## Simple usage¶

Let's demonstrate a simple usage example. We will create three tasks:

1. Append "bar".
2. Pause for human input. When resuming, append human input.
3. Append "qux".

```
import { task, interrupt } from "@langchain/langgraph"; const step1 = task("step1", async (inputQuery: string) => { return `${inputQuery} bar`; }); const humanFeedback = task(
"humanFeedback", async (inputQuery: string) => { const feedback = interrupt(`Please provide feedback: ${inputQuery}`); return `${inputQuery} ${feedback}`; }); const step3 = task("step3", async (inputQuery: string) => { return `${inputQuery} qux`; });
```

We can now compose these tasks in a simple entrypoint:

```
import { MemorySaver, entrypoint } from "@langchain/langgraph"; const checkpointer = new MemorySaver(); const graph = entrypoint({ name: "graph", checkpointer, }, async (inputQuery: string) => { const result1 = await step1(inputQuery); const result2 = await humanFeedback(result1); const result3 = await step3(result2); return result3; });
```

All we have done to enable human-in-the-loop workflows is call interrupt() inside a task.

Tip

The results of prior tasks - in this case step1 -- are persisted, so that they are not run again following theinterrupt`.

Let's send in a query string:

```
const config = { configurable: { thread_id: "1" } }; const stream = await graph.stream("foo", config); for await (const event of stream) { console.log(event); }
```

```
{ step1: 'foo bar' } { __interrupt__: [ { value: 'Please provide feedback: foo bar', when: 'during', resumable: true, ns: [Array] } ] }
```

Note that we've paused with an interrupt after step1. The interrupt provides instructions to resume the run. To resume, we issue a Command containing the data expected by the humanFeedback task.

```
import { Command } from "@langchain/langgraph"; const resumeStream = await graph.stream(new Command({ resume: "baz" }), config); // Continue execution for await (const event of resumeStream) { if (event.__metadata__?.cached) { continue; } console.log(event); }
```

```
{ humanFeedback: 'foo bar baz' } { step3: 'foo bar baz qux' } { graph: 'foo bar baz qux' }
```

After resuming, the run proceeds through the remaining step and terminates as expected.

## Agent¶

We will build off of the agent created in the How to create a ReAct agent using the Functional API guide.

Here we will extend the agent by allowing it to reach out to a human for assistance when needed.

### Define model and tools¶

Let's first define the tools and model we will use for our example. As in the ReAct agent guide, we will use a single place-holder tool that gets a description of the weather for a location.

We will use an OpenAI chat model for this example, but any model supporting tool-calling will suffice.

```
import { ChatOpenAI } from "@langchain/openai"; import { tool } from "@langchain/core/tools"; import { z } from "zod"; const model = new ChatOpenAI({ model: "gpt-4o-mini", }); const getWeather = tool(async ({ location }) => { // This is a placeholder for the actual implementation const lowercaseLocation = location.toLowerCase(); if (lowercaseLocation.includes("sf") || lowercaseLocation.includes("san francisco")) { return "It's sunny!"; } else if (lowercaseLocation.includes("boston")) { return "It's rainy!"; } else { return `I am not sure what the weather is in ${location}`; } }, { name: "getWeather", schema: z.object({ location: z.string().describe("Location to get the weather for"), }), description: "Call to get the weather from a specific location.", });
```

To reach out to a human for assistance, we can simply add a tool that calls interrupt:

```
import { interrupt } from "@langchain/langgraph"; import { z } from "zod"; const humanAssistance = tool(async ({ query }) => { const humanResponse = interrupt({ query }); return humanResponse.data; }, { name: "humanAssistance", description: "Request assistance from a human.", schema: z.object({ query: z.string().describe("Human readable question for the human") }) }); const tools = [getWeather, humanAssistance];
```

### Define tasks¶

Our tasks are otherwise unchanged from the ReAct agent guide:

1. Call model: We want to query our chat model with a list of messages.
2. Call tool: If our model generates tool calls, we want to execute them.

We just have one more tool accessible to the model.

```
import { type BaseMessageLike, AIMessage, ToolMessage,
} from "@langchain/core/messages"; import { type ToolCall } from "@langchain/core/messages/tool"; import { task } from "@langchain/langgraph"; const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool])); const callModel = task("callModel", async (messages: BaseMessageLike[]) => { const response = await model.bindTools(tools).invoke(messages); return response; }); const callTool = task(
"callTool", async (toolCall: ToolCall): Promise<AIMessage> => { const tool = toolsByName[toolCall.name]; const observation = await tool.invoke(toolCall.args); return new ToolMessage({ content: observation, tool_call_id: toolCall.id }); // Can also pass toolCall directly into the tool to return a ToolMessage // return tool.invoke(toolCall); });
```

### Define entrypoint¶

Our entrypoint is also unchanged from the ReAct agent guide:

```
import { entrypoint, addMessages, MemorySaver } from "@langchain/langgraph"; const agent = entrypoint({ name: "agent", checkpointer: new MemorySaver(), }, async (messages: BaseMessageLike[]) => { let currentMessages = messages; let llmResponse = await callModel(currentMessages); while (true) { if (!llmResponse.tool_calls?.length) { break; } // Execute tools const toolResults = await Promise.all(
llmResponse.tool_calls.map((toolCall) => {
return callTool(toolCall);
})
);
// Append to message list currentMessages = addMessages(currentMessages, [llmResponse, ...toolResults]); // Call model again llmResponse = await callModel(currentMessages); } return llmResponse; });
```

### Usage¶

Let's invoke our model with a question that requires human assistance. Our question will also require an invocation of the getWeather tool:

```
import { BaseMessage, isAIMessage } from "@langchain/core/messages"; const prettyPrintMessage = (message: BaseMessage) => { console.log("=".repeat(30), `${message.getType()} message`, "=".repeat(30)); console.log(message.content); if (isAIMessage(message) && message.tool_calls?.length) { console.log(JSON.stringify(message.tool_calls, null, 2)); } } const prettyPrintStep = (step: Record<string, any>) => { if (step.__metadata__?.cached) { return; } for (const [taskName, update] of Object.entries(step)) { const message = update as BaseMessage; // Only print task updates if (taskName === "agent") continue; console.log(`\n${taskName}:`); if (taskName === "__interrupt__" || taskName === "reviewToolCall") { console.log(update); } else { prettyPrintMessage(message); } } }
```

```
const userMessage = { role: "user", content: [
"Can you reach out for human assistance: what should I feed my cat?", "Separately, can you check the weather in San Francisco?"
].join(" "), }; console.log(userMessage); const agentStream = await agent.stream([userMessage], { configurable: { thread_id: "1", } }); let lastStep; for await (const step of agentStream) { prettyPrintStep(step); lastStep = step; }
```

```
{ role: 'user', content: 'Can you reach out for human assistance: what should I feed my cat? Separately, can you check the weather in San Francisco?' } callModel: ============================== ai message ============================== [ { "name": "humanAssistance", "args": { "query": "What should I feed my cat?" }, "type": "tool_call", "id": "call_TwrNq6tGI61cDCJEpj175h7J" }, { "name": "getWeather", "args": { "location": "San Francisco" }, "type": "tool_call", "id": "call_fMzUBvc0SpZpXxM2LQLXfbke" } ] callTool: ============================== tool message ============================== It's sunny! __interrupt__: [ { value: { query: 'What should I feed my cat?' }, when: 'during', resumable: true, ns: [ 'callTool:2e0c6c40-9541-57ef-a7af-24213a10d5a4' ] } ]
```

Note that we generate two tool calls, and although our run is interrupted, we did not block the execution of the get_weather tool.

Let's inspect where we're interrupted:

```
console.log(JSON.stringify(lastStep));
```

```
{"__interrupt__":[{"value":{"query":"What should I feed my cat?"},"when":"during","resumable":true,"ns":["callTool:2e0c6c40-9541-57ef-a7af-24213a10d5a4"]}]}
```

We can resume execution by issuing a Command. Note that the data we supply in the Command can be customized to your needs based on the implementation of humanAssistance.

```
import { Command } from "@langchain/langgraph"; const humanResponse = "You should feed your cat a fish."; const humanCommand = new Command({ resume: { data: humanResponse }, }); const resumeStream2 = await agent.stream(humanCommand, config); for await (const step of resumeStream2) { prettyPrintStep(step); }
```

```
callTool: ============================== tool message ============================== You should feed your cat a fish. callModel: ============================== ai message ============================== For your cat, it is suggested that you feed it fish. As for the weather in San Francisco, it's currently sunny!
```

Above, when we resume we provide the final tool message, allowing the model to generate its response. Check out the LangSmith traces to see a full breakdown of the runs:

1. Trace from initial query
2. Trace after resuming

Note: The interrupt function propagates by throwing a special GraphInterrupt error. Therefore, you should avoid using try/catch blocks around the interrupt function - or if you do, ensure that the GraphInterrupt error is thrown again within your catch block.

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders