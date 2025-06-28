How to manage agent steps

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to manage agent steps¶

In this example we will build a ReAct Agent that explicitly manages intermediate steps.

The previous examples just put all messages into the model, but that extra context can distract the agent and add latency to the API calls. In this example we will only include the N most recent messages in the chat history. Note that this is meant to be illustrative of general state management.

## Setup¶

First we need to install required packages:

```
yarn add @langchain/langgraph @langchain/openai @langchain/core
```

Next, we need to set API keys for Anthropic (the LLM we will use).

```
// process.env.OPENAI_API_KEY = "sk_...";
```

Optionally, we can set API key for LangSmith tracing, which will give us best-in-class observability.

```
// Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "ls__..."; process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; process.env.LANGCHAIN_TRACING_V2 = "true"; process.env.LANGCHAIN_PROJECT = "Managing Agent Steps: LangGraphJS";
```

```
Managing Agent Steps: LangGraphJS
```

## Set up the State¶

The main type of graph in langgraph is the StateGraph. This graph is parameterized by a state object that it passes around to each node. Each node then returns operations to update that state. These operations can either SET specific attributes on the state (e.g. overwrite the existing values) or ADD to the existing attribute. Whether to set or add is denoted in the state object you construct the graph with.

For this example, the state we will track will just be a list of messages. We want each node to just add messages to that list. Therefore, we will define the state as follows:

```
import { Annotation } from "@langchain/langgraph"; import { BaseMessage } from "@langchain/core/messages"; const AgentState = Annotation.Root({ messages: Annotation<BaseMessage[]>({ reducer: (x, y) => x.concat(y), }), });
```

## Set up the tools¶

We will first define the tools we want to use. For this simple example, we will create a placeholder search engine. It is really easy to create your own tools - see documentation here on how to do that.

```
import { DynamicStructuredTool } from "@langchain/core/tools"; import { z } from "zod"; const searchTool = new DynamicStructuredTool({ name: "search", description: "Call to surf the web.", schema: z.object({ query: z.string().describe("The query to use in your search."), }), func: async ({}: { query: string }) => { // This is a placeholder, but don't tell the LLM that... return "Try again in a few seconds! Checking with the weathermen... Call be again next."; }, }); const tools = [searchTool];
```

We can now wrap these tools in a simple ToolNode.\ This is a simple class that takes in a list of messages containing an AIMessages with tool\_calls, runs the tools, and returns the output as ToolMessages.

```
import { ToolNode } from "@langchain/langgraph/prebuilt"; const toolNode = new ToolNode<typeof AgentState.State>(tools);
```

## Set up the model¶

Now we need to load the chat model we want to use. This should satisfy two criteria:

1. It should work with messages, since our state is primarily a list of messages (chat history).
2. It should work with tool calling, since we are using a prebuilt ToolNode

Note: these model requirements are not requirements for using LangGraph - they are just requirements for this particular example.

```
import { ChatOpenAI } from "@langchain/openai"; const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0, });
```

```
// After we've done this, we should make sure the model knows that it has these tools available to call. // We can do this by binding the tools to the model class. const boundModel = model.bindTools(tools);
```

## Define the nodes¶

We now need to define a few different nodes in our graph. In langgraph, a node can be either a function or a runnable. There are two main nodes we need for this:

1. The agent: responsible for deciding what (if any) actions to take.
2. A function to invoke tools: if the agent decides to take an action, this node will then execute that action.

We will also need to define some edges. Some of these edges may be conditional. The reason they are conditional is that based on the output of a node, one of several paths may be taken. The path that is taken is not known until that node is run (the LLM decides).

1. Conditional Edge: after the agent is called, we should either: a. If the agent said to take an action, then the function to invoke tools should be called\ b. If the agent said that it was finished, then it should finish
2. Normal Edge: after the tools are invoked, it should always go back to the agent to decide what to do next

Let's define the nodes, as well as a function to decide how what conditional edge to take.

```
import { END } from "@langchain/langgraph"; import { AIMessage, Too

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>