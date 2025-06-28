How to view and update past graph state

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to view and update past graph state¶

Prerequisites

This guide assumes familiarity with the following concepts:

* Time Travel
* Breakpoints
* LangGraph Glossary

Once you start checkpointing your graphs, you can easily get or update the state of the agent at any point in time. This permits a few things:

1. You can surface a state during an interrupt to a user to let them accept an action.
2. You can rewind the graph to reproduce or avoid issues.
3. You can modify the state to embed your agent into a larger system, or to let the user better control its actions.

The key methods used for this functionality are:

* getState: fetch the values from the target config
* updateState: apply the given values to the target state

Note: this requires passing in a checkpointer.

<!-- Example:

```
TODO ... ``` --> This works for <a href="/langgraphjs/reference/classes/langgraph.StateGraph.html">StateGraph</a> and all its subclasses, such as <a href="/langgraphjs/reference/classes/langgraph.MessageGraph.html">MessageGraph</a>. Below is an example. <div class="admonition tip"> <p class="admonition-title">Note</p> <p> In this how-to, we will create our agent from scratch to be transparent (but verbose). You can accomplish similar functionality using the <code>createReactAgent(model, tools=tool, checkpointer=checkpointer)</code> (<a href="/langgraphjs/reference/functions/langgraph_prebuilt.createReactAgent.html">API doc</a>) constructor. This may be more appropriate if you are used to LangChain's <a href="https://js.langchain.com/docs/how_to/agent_executor">AgentExecutor</a> class. </p> </div> ## Setup This guide will use OpenAI's GPT-4o model. We will optionally set our API key for [LangSmith tracing](https://smith.langchain.com/), which will give us best-in-class observability. ```typescript // process.env.OPENAI_API_KEY = "sk_..."; // Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "ls__..."; process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; process.env.LANGCHAIN_TRACING_V2 = "true"; process.env.LANGCHAIN_PROJECT = "Time Travel: LangGraphJS";
```

```
Time Travel: LangGraphJS
```

## Define the state¶

The state is the interface for all of the nodes in our graph.

```
import { Annotation } from "@langchain/langgraph"; import { BaseMessage } from "@langchain/core/messages"; const StateAnnotation = Annotation.Root({ messages: Annotation<BaseMessage[]>({ reducer: (x, y) => x.concat(y), }), });
```

## Set up the tools¶

We will first define the tools we want to use. For this simple example, we will use create a placeholder search engine. However, it is really easy to create your own tools - see documentation here on how to do that.

```
import { tool } from "@langchain/core/tools"; import { z } from "zod"; const searchTool = tool(async (_) => { // This is a placeholder for the actual implementation return "Cold, with a low of 13 °C"; }, { name: "search", description: "Use to surf the web, fetch current information, check the weather, and retrieve other information.", schema: z.object({ query: z.string().describe("The query to use in your search."), }), }); await searchTool.invoke({ query: "What's the weather like?" }); const tools = [searchTool];
```

We can now wrap these tools in a simple ToolNodee agent. Between interactions you can get and update state.

```
let config = { configurable: { thread_id: "conversation-num-1" } }; let inputs = { messages: [{ role: "user", content: "Hi I'm Jo." }] } as any; for await ( const { messages } of await graph.stream(inputs, { ...config, streamMode: "values", }) ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } else if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } else { console.log(msg); } console.log("-----\n"); }