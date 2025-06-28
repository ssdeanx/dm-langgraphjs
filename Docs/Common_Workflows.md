Workflows and Agents

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# Workflows and Agents¶

This guide reviews common patterns for agentic systems. In describing these systems, it can be useful to make a distinction between "workflows" and "agents". One way to think about this difference is nicely explained here by Anthropic:

> Workflows are systems where LLMs and tools are orchestrated through predefined code paths. Agents, on the other hand, are systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks.

Here is a simple way to visualize these differences:

When building agents and workflows, LangGraph offers a number of benefits including persistence, streaming, and support for debugging as well as deployment.

## Set up¶

Note

The Functional API requires @langchain/langgraph>=0.2.24.

You can use any chat model that supports structured outputs and tool calling. Below, we show the process of installing the packages, setting API keys, and testing structured outputs / tool calling for Anthropic.

Initialize an LLM

```
import { ChatAnthropic } from "@langchain/anthropic"; process.env.ANTHROPIC_API_KEY = "<your_anthropic_key>"; const llm = new ChatAnthropic({ model: "claude-3-5-sonnet-latest", });
```

## Building Blocks: The Augmented LLM¶

LLM have augmentations that support building workflows and agents. These include structured outputs and tool calling, as shown in this image from the Anthropic blog:

```
import { tool } from "@langchain/core/tools"; import { z } from "zod"; const searchQuerySchema = z.object({ searchQuery: z.string().describe("Query that is optimized web search."), justification: z.string("Why this query is relevant to the user's request."), }); // Augment the LLM with schema for structured output const structuredLlm = llm.withStructuredOutput(searchQuerySchema, { name: "searchQuery", }); // Invoke the augmented LLM const output = await structuredLlm.invoke( "How does Calcium CT score relate to high cholesterol?" ); const multiply = tool(
 async ({ a, b }) => {
 return a * b;
 }, {
 name: "multiply",
 description: "multiplies two numbers together",
 schema: z.object({
 a: z.number("the first number"),
 b: z.number("the second number"),
 }),
 } ); // Augment the LLM with tools const llmWithTools = llm.bindTools([multiply]); // Invoke the LLM with input that triggers the tool call const message = await llmWithTools.invoke("What is 2 times 3?"); console.log(message.tool_calls);
```

## Prompt chaining¶

In prompt chaining, each LLM call processes the output of the previous one.

As noted in the Anthropic blog:

> Prompt chaining decomposes a task into a sequence of steps, where each LLM call processes the output of the previous one. You can add programmatic checks (see "gate” in the diagram below) on any intermediate steps to ensure that the process is still on track.
>
> When to use this workflow: This workflow is ideal for situations where the task can be easily and cleanly decomposed into fixed subtasks. The main goal is to trade off latency for higher accuracy, by making each LLM call an easier task.

```
import { StateGraph, Annotation } from "@langchain/langgraph"; // Graph state const StateAnnotation = Annotation.Root({ topic: Annotation<string>, joke: Annotation<string>, improvedJoke: Annotation<string>, finalJoke: Annotation<string>, }); // Define node functions // First LLM call to generate initial joke async function generateJoke(state: typeof StateAnnotation.State) { const msg = await llm.invoke(`Write a short joke about ${state.topic}`); return { joke: msg.content }; } // Gate function to check if the joke has a punchline function checkPunchline(state: typeof StateAnnotation.State) { // Simple check - does the joke contain "?" or "!" if (state.joke?.includes("?") || state.joke?.includes("!")) {
 return "Pass";
 } return "Fail"; } // Second LLM call to improve the joke async function improveJoke(state: typeof StateAnnotation.State) { const msg = await llm.invoke(
 `Make this joke funnier by adding wordplay: ${state.joke}`
 ); return { improvedJoke: msg.content }; } // Third LLM call for final polish async function polishJoke(state: typeof StateAnnotation.State) { const msg = await llm.invoke(
 `Add a surprising twist to this joke: ${state.improvedJoke}`
 ); return { finalJoke: msg.content }; } // Build workflow const chain = new StateGraph(StateAnnotation)
 .addNode("generateJoke", generateJoke)
 .addNode("improveJoke", improveJoke)
 .addNode("polishJoke", polishJoke)
 .addEdge("__start__", "generateJoke")
 .addConditionalEdges("generateJoke", checkPunchline, {
 Pass: "improveJoke",
 Fail: "__end__"
 })
 .addEdge("improveJoke", "polishJoke")
 .addEdge("polishJoke", "__end__")
 .compile(); // Invoke const state = await chain.invoke({ topic: "cats" }); console.log("Initial joke:"); console.log(state.joke);
 console.log("\n--- --- ---\n"); if (state.improvedJoke !== undefined) {

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>
```