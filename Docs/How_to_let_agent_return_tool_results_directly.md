How to let agent return tool results directly

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to let agent return tool results directly¶

A typical ReAct loop follows user -> assistant -> tool -> assistant ..., -> user. In some cases, you don't need to call the LLM after the tool completes, the user can view the results directly themselves.

In this example we will build a conversational ReAct agent where the LLM can optionally decide to return the result of a tool call as the final answer. This is useful in cases where you have tools that can sometimes generate responses that are acceptable as final answers, and you want to use the LLM to determine when that is the case

## Setup¶

First we need to install the packages required

```
yarn add @langchain/langgraph @langchain/openai @langchain/core
```

Next, we need to set API keys for OpenAI (the LLM we will use). Optionally, we can set API key for LangSmith tracing, which will give us best-in-class observability.

```
// process.env.OPENAI_API_KEY = "sk_..."; // Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "ls__..." process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; process.env.LANGCHAIN_TRACING_V2 = "true"; process.env.LANGCHAIN_PROJECT = "Direct Return: LangGraphJS";
```

```
Direct Return: LangGraphJS
```

## Set up the tools¶

We will first define the tools we want to use. For this simple example, we will use a simple placeholder "search engine". However, it is really easy to create your own tools - see documentation here on how to do that.

To add a 'return\_direct' option, we will create a custom zod schema to use instead of the schema that would be automatically inferred by the tool.

```
import { DynamicStructuredTool } from "@langchain/core/tools"; import { z } from "zod"; const SearchTool = z.object({ query: z.string().describe("query to look up online"), // **IMPORTANT** We are adding an **extra** field here // that isn't used directly by the tool - it's used by our // graph instead to determine whether or not to return the // result directly to the user return_direct: z.boolean() .describe( "Whether or not the result of this should be returned directly to the user without you seeing what it is", ) .default(false), }); const searchTool = new DynamicStructuredTool({ name: "search", description: "Call to surf the web.", // We are overriding the default schema here to // add an extra field schema: SearchTool, func: async ({}: { query: string }) => { // This is a placeholder for the actual implementation // Don't let the LLM know this though 😊 return "It's sunny in San Francisco, but you better look out if you're a Gemini 😈."; }, }); const tools = [searchTool];
```

We can now wrap these tools in a ToolNode. This is a prebuilt node that takes in a LangChain chat model's generated tool call and calls that tool, returning the output.

```
import { ToolNode } from "@langchain/langgraph/prebuilt"; const toolNode = new ToolNode(tools);
```

## Set up the model¶

Now we need to load the chat model we want to use.\ Importantly, this should satisfy two criteria:

1. It should work with messages. We will represent all agent state in the form of messages, so it needs to be able to work well with them.
2. It should support tool calling.

Note: these model requirements are not requirements for using LangGraph - they are just requirements for this one example.

```
import { ChatOpenAI } from "@langchain/openai"; const model = new ChatOpenAI({ temperature: 0, model: "gpt-3.5-turbo", }); // This formats the tools as json schema for the model API. // The model then uses this like a system prompt. const boundModel = model.bindTools(tools);
```

## Define the agent state¶

The main type of graph in langgraph is the StateGraph.

This graph is parameterized by a state object that it passes around to each node. Each node then returns operations to update that state. These operations can either SET specific attributes on the state (e.g. overwrite the existing values) or ADD to the existing attribute. Whether to set or add is denoted in the state object you construct the graph with.

For this example, the state we will track will just be a list of messages. We want each node to just add messages to that list. Therefore, we will define the state as follows:

```
import { Annotation } from "@langchain/langgraph"; import { BaseMessage } from "@langchain/core/messages"; const AgentState = Annotation.Root({ messages: Annotation<BaseMessage[]>({ reducer: (x, y) => x.concat(y), }), });
```

## Define the nodes¶

We now need to define a few different nodes in our graph. In langgraph, a node can be either a function or a runnable. There are two main nodes we need for this:

1. The agent: responsible for deciding what (if any) actions to take.
2. A function to invoke tools: if the agent decides to take an action, this node will then execute that action.

We will also need to define some ed

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>