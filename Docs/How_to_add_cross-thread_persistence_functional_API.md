How to add cross-thread persistence (functional API)

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add cross-thread persistence (functional API)¶

Prerequisites

This guide assumes familiarity with the following:

* Functional API
* Persistence
* Memory
* Chat Models

LangGraph allows you to persist data across different threads. For instance, you can store information about users (their names or preferences) in a shared (cross-thread) memory and reuse them in the new threads (e.g., new conversations).

When using the functional API, you can set it up to store and retrieve memories by using the Store interface:

1. Create an instance of a Store

   ```
   import { InMemoryStore } from "@langchain/langgraph"; const store = new InMemoryStore();
   ```
2. Pass the store instance to the entrypoint() wrapper function. It will be passed to the workflow as config.store.

   ```
   import { entrypoint } from "@langchain/langgraph"; const workflow = entrypoint({ store, name: "myWorkflow", }, async (input, config) => { const foo = await myTask({input, store: config.store}); ... });
   ```

In this guide, we will show how to construct and use a workflow that has a shared memory implemented using the Store interface.

Note

If you need to add cross-thread persistence to a StateGraph, check out this how-to guide.

## Setup¶

Note

This guide requires @langchain/langgraph>=0.2.42.

First, install the required dependencies for this example:

```
npm install @langchain/langgraph @langchain/openai @langchain/anthropic @langchain/core uuid
```

Next, we need to set API keys for Anthropic and OpenAI (the LLM and embeddings we will use):

```
process.env.OPENAI_API_KEY = "YOUR_API_KEY"; process.env.ANTHROPIC_API_KEY = "YOUR_API_KEY";
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here

## Example: simple chatbot with long-term memory¶

### Define store¶

In this example we will create a workflow that will be able to retrieve information about a user's preferences. We will do so by defining an InMemoryStore - an object that can store data in memory and query that data.

When storing objects using the Store interface you define two things:

* the namespace for the object, a tuple (similar to directories)
* the object key (similar to filenames)

In our example, we'll be using ["memories", <user_id>] as namespace and random UUID as key for each new memory.

Let's first define our store:

```
import { InMemoryStore } from "@langchain/langgraph"; import { OpenAIEmbeddings } from "@langchain/openai"; const inMemoryStore = new InMemoryStore({ index: { embeddings: new OpenAIEmbeddings({ model: "text-embedding-3-small", }), dims: 1536, }, });
```

### Create workflow¶

Now let's create our workflow:

```
import { v4 as uuidv4 } from "uuid"; import { ChatAnthropic } from "@langchain/anthropic"; import { entrypoint, task, MemorySaver, addMessages, type BaseStore, getStore, } from "@langchain/langgraph"; import type { BaseMessage, BaseMessageLike } from "@langchain/core/messages"; const model = new ChatAnthropic({ model: "claude-3-5-sonnet-latest", }); const callModel = task("callModel", async ( messages: BaseMessage[], memoryStore: BaseStore, userId: string ) => { const namespace = ["memories", userId]; const lastMessage = messages.at(-1);
if (typeof lastMessage?.content !== "string") {
throw new Error("Received non-string message content.");
}
const memories = await memoryStore.search(namespace, { query: lastMessage.content, });
const info = memories.map((memory) => memory.value.data).join("\n");
const systemMessage = `You are a helpful assistant talking to the user. User info: ${info}`;
// Store new memories if the user asks the model to remember if (lastMessage.content.toLowerCase().includes("remember")) {
// Hard-coded for demo const memory = `Username is Bob`; await memoryStore.put(namespace, v4(), { data: memory });
}
const response = await model.invoke([
{
type: "system", content: systemMessage
},
...messages
]);
return response;
});
// NOTE: we're passing the store object here when creating a workflow via entrypoint() const workflow = entrypoint({ checkpointer: new MemorySaver(), store: inMemoryStore, name: "workflow", }, async (params: { messages: BaseMessageLike[]; userId: string; }, config) => { const messages = addMessages([], params.messages)
const response = await callModel(messages, config.store, params.userId);
return entrypoint.final({ value: response, save: addMessages(messages, response), });
});
```
The current store is passed in as part of the entrypoint's second argument, as config.store.

Note

If you're using LangGraph Cloud or LangGraph Studio, you don't need to pass store into the entrypoint, since it's done automatica
<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>