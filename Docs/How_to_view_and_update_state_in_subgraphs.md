How to view and update state in subgraphs

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to view and update state in subgraphs¶

Prerequisites

This guide assumes familiarity with the following:

* Subgraphs
* Human-in-the-loop
* State

Once you add persistence, you can view and update the state of the subgraph at any point in time. This enables human-in-the-loop interaction patterns such as:

* You can surface a state during an interrupt to a user to let them accept an action.
* You can rewind the subgraph to reproduce or avoid issues.
* You can modify the state to let the user better control its actions.

This guide shows how you can do this.

## Setup¶

First we need to install required packages:

```
npm install @langchain/langgraph @langchain/core @langchain/openai
```

Next, we need to set API keys for OpenAI (the provider we'll use for this guide):

```
// process.env.OPENAI_API_KEY = "YOUR_API_KEY";
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here.

## Define subgraph¶

First, let's set up our subgraph. For this, we will create a simple graph that can get the weather for a specific city. We will compile this graph with a breakpoint before the weather\_node:

```
import { z } from "zod"; import { tool } from "@langchain/core/tools"; import { ChatOpenAI } from "@langchain/openai"; import { StateGraph, MessagesAnnotation, Annotation } from "@langchain/langgraph"; const getWeather = tool(async ({ city }) => { return `It's sunny in ${city}`; }, { name: "get_weather", description: "Get the weather for a specific city", schema: z.object({ city: z.string().describe("A city name") }) }); const rawModel = new ChatOpenAI({ model: "gpt-4o-mini" }); const model = rawModel.withStructuredOutput(getWeather); // Extend the base MessagesAnnotation state with another field const SubGraphAnnotation = Annotation.Root({ ...MessagesAnnotation.spec, city: Annotation<string>, }); const modelNode = async (state: typeof SubGraphAnnotation.State) => { const result = await model.invoke(state.messages); return { city: result.city }; }; const weatherNode = async (state: typeof SubGraphAnnotation.State) => { const result = await getWeather.invoke({ city: state.city }); return { messages: [ { role: "assistant", content: result, } ] }; }; const subgraph = new StateGraph(SubGraphAnnotation) .addNode("modelNode", modelNode) .addNode("weatherNode", weatherNode) .addEdge("__start__", "modelNode") .addEdge("modelNode", "weatherNode") .addEdge("weatherNode", "__end__") .compile({ interruptBefore: ["weatherNode"] });
```

## Define parent graph¶

We can now setup the overall graph. This graph will first route to the subgraph if it needs to get the weather, otherwise it will route to a normal LLM.

```
import { MemorySaver } from "@langchain/langgraph"; const memory = new MemorySaver(); const RouterStateAnnotation = Annotation.Root({ ...MessagesAnnotation.spec, route: Annotation<"weather" | "other">, }); const routerModel = rawModel.withStructuredOutput( z.object({ route: z.enum(["weather", "other"]).describe("A step that should execute next to based on the currnet input") }), { name: "router" } ); const routerNode = async (state: typeof RouterStateAnnotation.State) => { const systemMessage = { role: "system", content: "Classify the incoming query as either about weather or not.", }; const messages = [systemMessage, ...state.messages] const { route } = await routerModel.invoke(messages); return { route }; } const normalLLMNode = async (state: typeof RouterStateAnnotation.State) => { const responseMessage = await rawModel.invoke(state.messages); return { messages: [responseMessage] }; }; const routeAfterPrediction = async (state: typeof RouterStateAnnotation.State) => { if (state.route === "weather") { return "weatherGraph"; } else { return "normalLLMNode"; } }; const graph = new StateGraph(RouterStateAnnotation) .addNode("routerNode", routerNode) .addNode("normalLLMNode", normalLLMNode) .addNode("weatherGraph", subgraph) .addEdge("__start__", "routerNode") .addConditionalEdges("routerNode", routeAfterPrediction) .addEdge("normalLLMNode", "__end__") .addEdge("weatherGraph", "__end__") .compile({ checkpointer: memory });
```

Here's a diagram of the graph we just created:

Let's test this out with a normal query to make sure it works as intended!

```
const config = { configurable: { thread_id: "1" } }; const inputs = { messages: [{ role: "user", content: "hi!" }] }; const stream = await graph.stream(inputs, { ...config, streamMode: "updates" }); for await (const update of stream) { console.log(update); }
```

```
{ routerNode: { route: 'other' } } { normalLLMNode: { messages: [ AIMessage { "id": "chatcmpl-ABtbbiB5N3Uue85UNrFUjw5KhGaud", "co

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>