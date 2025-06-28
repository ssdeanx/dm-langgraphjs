How to add cross-thread persistence to your graph

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add cross-thread persistence to your graph¶

Prerequisites

This guide assumes familiarity with the following:

* Persistence
* Memory
* Chat Models

In the previous guide you learned how to persist graph state across multiple interactions on a single thread. LangGraph.js also allows you to persist data across multiple threads. For instance, you can store information about users (their names or preferences) in a shared memory and reuse them in the new conversational threads.

In this guide, we will show how to construct and use a graph that has a shared memory implemented using the Store interface.

Note

Support for the Store API that is used in this guide was added in LangGraph.js v0.2.10.

## Setup¶

First, let's install the required packages and set our API keys.

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here.

```
// process.env.OPENAI_API_KEY = "sk_..."; // Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "lsv2__..."; // process.env.ANTHROPIC_API_KEY = "your api key"; // process.env.LANGCHAIN_TRACING_V2 = "true"; // process.env.LANGCHAIN_PROJECT = "Cross-thread persistence: LangGraphJS";
```

## Define store¶

In this example we will create a graph that will be able to retrieve information about a user's preferences. We will do so by defining an InMemoryStore - an object that can store data in memory and query that data. We will then pass the store object when compiling the graph. This allows each node in the graph to access the store: when you define node functions, you can define store keyword argument, and LangGraph will automatically pass the store object you compiled the graph with.

When storing objects using the Store interface you define two things:

* the namespace for the object, a tuple (similar to directories)
* the object key (similar to filenames)

In our example, we'll be using ("memories", <userId>) as namespace and random UUID as key for each new memory.

Importantly, to determine the user, we will be passing userId via the config keyword argument of the node function.

Let's first define an InMemoryStore which is already populated with some memories about the users.

```
import { InMemoryStore } from "@langchain/langgraph"; const inMemoryStore = new InMemoryStore();
```

## Create graph¶

```
import { v4 as uuidv4 } from "uuid"; import { ChatAnthropic } from "@langchain/anthropic"; import { BaseMessage } from "@langchain/core/messages"; import { Annotation, StateGraph, START, MemorySaver, LangGraphRunnableConfig, messagesStateReducer, } from "@langchain/langgraph"; const StateAnnotation = Annotation.Root({ messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer, default: () => [], }), }); const model = new ChatAnthropic({ modelName: "claude-3-5-sonnet-20240620" }); // NOTE: we're passing the Store param to the node -- // this is the Store we compile the graph with const callModel = async ( state: typeof StateAnnotation.State, config: LangGraphRunnableConfig ): Promise<{ messages: any }> => { const store = config.store; if (!store) { if (!store) { throw new Error("store is required when compiling the graph"); } } if (!config.configurable?.userId) { throw new Error("userId is required in the config"); } const namespace = ["memories", config.configurable?.userId]; const memories = await store.search(namespace);
const info = memories.map((d) => d.value.data).join("\n"); const systemMsg = `You are a helpful assistant talking to the user. User info: ${info}`; // Store new memories if the user asks the model to remember const lastMessage = state.messages[state.messages.length - 1]; if ( typeof lastMessage.content === "string" && lastMessage.content.toLowerCase().includes("remember") ) { await store.put(namespace, uuidv4(), { data: lastMessage.content }); } const response = await model.invoke([ { type: "system", content: systemMsg }, ...state.messages, ]); return { messages: [response] }; }; const builder = new StateGraph(StateAnnotation) .addNode("call_model", callModel) .addEdge(START, "call_model"); // NOTE: we're passing the store object here when compiling the graph const graph = builder.compile({ checkpointer: new MemorySaver(), store: inMemoryStore, }); // If you're using LangGraph Cloud or LangGraph Studio, you don't need to pass the store or checkpointer when compiling the graph, since it's done automatically.
```

Note

If you're using LangGraph Cloud or LangGraph Studio, you don't need to pass store when compiling the graph, since it's done automatically.

## Run the graph!¶

Now let's specify a user ID in the config and tell the model our name:

```
le

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>
