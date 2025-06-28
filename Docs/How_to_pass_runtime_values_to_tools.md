How to pass runtime values to tools

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to pass runtime values to tools¶

This guide shows how to define tools that depend on dynamically defined variables. These values are provided by your program, not by the LLM.

Tools can access the config.configurable field for values like user IDs that are known when a graph is initially executed, as well as managed values from the store for persistence across threads.

However, it can be convenient to access intermediate runtime values which are not known ahead of time, but are progressively generated as a graph executes, such as the current graph state. This guide will cover two techniques for this: The getCurrentTaskInput utility function, and closures.

## Setup¶

Install the following to run this guide:

```
npm install @langchain/langgraph @langchain/openai @langchain/core
```

Next, configure your environment to connect to your model provider.

```
export OPENAI_API_KEY=your-api-key
```

Optionally, set your API key for LangSmith tracing, which will give us best-in-class observability.

```
export LANGCHAIN_TRACING_V2="true" export LANGCHAIN_CALLBACKS_BACKGROUND="true" export LANGCHAIN_API_KEY=your-api-key
```

## The getCurrentTaskInput Utility Function¶

The getCurrentTaskInput utility function makes it easier to get the current state in areas of your application that might be called indirectly, like tool handlers.

Compatibility

This functionality was added in @langchain/langgraph>=0.2.53.

It also requires async\_hooks support, which is supported in many popular JavaScript environments (such as Node.js, Deno, and Cloudflare Workers), but not all of them (mainly web browsers). If you are deploying to an environment where this is not supported, see the closures section below.

Let's start off by defining a tool that an LLM can use to update pet preferences for a user. The tool will retrieve the current state of the graph from the current context.

### Define the agent state¶

Since we're just tracking messages, we'll use the MessagesAnnotation:

```
import { MessagesAnnotation } from "@langchain/langgraph";
```

Now, declare a tool as shown below. The tool receives values in three different ways:

1. It will receive a generated list of pets from the LLM in its input.
2. It will pull a userId populated from the initial graph invocation.
3. It will fetch the input that was passed to the currenty executing task (either a StateGraph node handler, or a Functional API entrypoint or task) via the getCurrentTaskInput function.

It will then use LangGraph's cross-thread persistence to save preferences:

```
import { z } from "zod"; import { tool } from "@langchain/core/tools"; import { getCurrentTaskInput, LangGraphRunnableConfig, } from "@langchain/langgraph"; const updateFavoritePets = tool(async (input, config: LangGraphRunnableConfig) => { // Some arguments are populated by the LLM; these are included in the schema below const { pets } = input; // Fetch the current input to the task that called this tool. // This will be identical to the input that was passed to the `ToolNode` that called this tool. const currentState = getCurrentTaskInput() as typeof MessagesAnnotation.State; // Other information (such as a UserID) are most easily provided via the config // This is set when when invoking or streaming the graph const userId = config.configurable?.userId; // LangGraph's managed key-value store is also accessible from the config const store = config.store; await store.put([userId, "pets"], "names", pets); // Store the initial input message from the user as a note. // Using the same key will override previous values - you could // use something different if you wanted to store many interactions. await store.put([userId, "pets"], "context", { content: currentState.messages[0].content }); return "update_favorite_pets called."; }, { // The LLM "sees" the following schema: name: "update_favorite_pets", description: "add to the list of favorite pets.", schema: z.object({ pets: z.array(z.string()), }), });
```

If we look at the tool call schema, which is what is passed to the model for tool-calling, we can see that only pets is being passed:

```
import { zodToJsonSchema } from "zod-to-json-schema"; console.log(zodToJsonSchema(updateFavoritePets.schema));
```

```
{ type: 'object', properties: { pets: { type: 'array', items: [Object] } }, required: [ 'pets' ], additionalProperties: false, '$schema': 'http://json-schema.org/draft-07/schema#' }
```

Let's also declare another tool so that our agent can retrieve previously set preferences:

```
const getFavoritePets = tool( async (_, config: LangGraphRunnableConfig) => { const userId = config.configurable?.userId; // LangGraph's managed key-value store is also accessible via the config const store = config.store; const petNames = await store.get([userId, "pets"], "names"); const context = await store.get([userId, "

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>