How to stream state updates of your graph

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to stream state updates of your graph¶

LangGraph supports multiple streaming modes. The main ones are:

* values: This streaming mode streams back values of the graph. This is the full state of the graph after each node is called.
* updates: This streaming mode streams back updates to the graph. This is the update to the state of the graph after each node is called.

This guide covers streamMode="updates".

```
// process.env.OPENAI_API_KEY = "sk-...";
```

## Define the state¶

The state is the interface for all of the nodes in our graph.

```
import { Annotation } from "@langchain/langgraph"; import { BaseMessage } from "@langchain/core/messages"; const StateAnnotation = Annotation.Root({ messages: Annotation<BaseMessage[]>({ reducer: (x, y) => x.concat(y), }), });
```

## Set up the tools¶

We will first define the tools we want to use. For this simple example, we will use create a placeholder search engine. However, it is really easy to create your own tools - see documentation here on how to do that.

```
import { tool } from "@langchain/core/tools"; import { z } from "zod"; const searchTool = tool(async ({ query: _query }: { query: string }) => { // This is a placeholder for the actual implementation return "Cold, with a low of 3°C"; }, { name: "search", description: "Use to surf the web, fetch current information, check the weather, and retrieve other information.", schema: z.object({ query: z.string().describe("The query to use in your search."), }), }); await searchTool.invoke({ query: "What's the weather like?" }); const tools = [searchTool];
```

We can now wrap these tools in a simple ToolNode. This object will actually run the tools (functions) whenever they are invoked by our LLM.

```
import { ToolNode } from "@langchain/langgraph/prebuilt"; const toolNode = new ToolNode(tools);
```

## Set up the model¶

Now we will load the chat model.

1. It should work with messages. We will represent all agent state in the form of messages, so it needs to be able to work well with them.
2. It should work with tool calling, meaning it can return function arguments in its response.

Note

These model requirements are not general requirements for using LangGraph - they are just requirements for this one example.

```
import { ChatOpenAI } from "@langchain/openai"; const model = new ChatOpenAI({ model: "gpt-4o" });
```

After we've done this, we should make sure the model knows that it has these tools available to call. We can do this by calling bindTools.

```
const boundModel = model.bindTools(tools);
```

## Define the graph¶

We can now put it all together.

```
import { END, START, StateGraph } from "@langchain/langgraph"; import { AIMessage } from "@langchain/core/messages"; const routeMessage = (state: typeof StateAnnotation.State) => { const { messages } = state; const lastMessage = messages[messages.length - 1] as AIMessage; // If no tools are called, we can finish (respond to the user) if (!lastMessage?.tool_calls?.length) { return END; } // Otherwise if there is, we continue and call the tools return "tools"; }; const callModel = async ( state: typeof StateAnnotation.State, ) => { const { messages } = state; const responseMessage = await boundModel.invoke(messages); return { messages: [responseMessage] }; }; const workflow = new StateGraph(StateAnnotation) .addNode("agent", callModel) .addNode("tools", toolNode) .addEdge(START, "agent") .addConditionalEdges("agent", routeMessage) .addEdge("tools", "agent"); const graph = workflow.compile();
```

## Stream updates¶

We can now interact with the agent.

```
let inputs = { messages: [{ role: "user", content: "what's the weather in sf" }] }; for await ( const chunk of await graph.stream(inputs, { streamMode: "updates", }) ) { for (const [node, values] of Object.entries(chunk)) { console.log(`Receiving update from node: ${node}`); console.log(values); console.log("\n====\n"); } }