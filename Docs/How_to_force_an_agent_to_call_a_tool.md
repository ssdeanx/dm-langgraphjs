How to force an agent to call a tool

In this example we will build a ReAct agent that always calls a certain tool first, before making any plans. In this example, we will create an agent with a search tool. However, at the start we will force the agent to call the search tool (and then let it do whatever it wants after). This is useful when you know you want to execute specific actions in your application but also want the flexibility of letting the LLM follow up on the user's query after going through that fixed sequence.

## Setup¶

First we need to install the packages required

```
yarn add @langchain/langgraph @langchain/openai @langchain/core
```

Next, we need to set API keys for OpenAI (the LLM we will use). Optionally, we can set API key for LangSmith tracing, which will give us best-in-class observability.

```
// process.env.OPENAI_API_KEY = "sk_..."; // Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "ls__..."; // process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; process.env.LANGCHAIN_TRACING_V2 = "true"; process.env.LANGCHAIN_PROJECT = "Force Calling a Tool First: LangGraphJS";
```

```
Force Calling a Tool First: LangGraphJS
```

## Set up the tools¶

We will first define the tools we want to use. For this simple example, we will use a built-in search tool via Tavily. However, it is really easy to create your own tools - see documentation here on how to do that.

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
2. It should work with OpenAI function calling. This means it should either be an OpenAI model or a model that exposes a similar interface.

Note: these model requirements are not requirements for using LangGraph - they are just requirements for this one example.

```
import { ChatOpenAI } from "@langchain/openai"; const model = new ChatOpenAI({ temperature: 0, model: "gpt-4o", });
```

After we've done this, we should make sure the model knows that it has these tools available to call. We can do this by converting the LangChain tools into the format for OpenAI function calling, and then bind them to the model class.

```
const boundModel = model.bindTools(tools);
```

## Define the agent state¶

The main type of graph in langgraph is the StateGraph. This graph is parameterized by a state object that it passes around to each node. Each node then returns operations to update that state. These operations can either SET specific attributes on the state (e.g. overwrite the existing values) or ADD to the existing attribute. Whether to set or add is denoted in the state object you construct the graph with.

For this example, the state we will track will just be a list of messages. We want each node to just add messages to that list. Therefore, we will define the agent state as follows:

```
import { Annotation } from "@langchain/langgraph"; import { BaseMessage } from "@langchain/core/messages"; const AgentState = Annotation.Root({ messages: Annotation<BaseMessage[]>({ reducer: (x, y) => x.concat(y), }), });
```

## Define the nodes¶

We now need to define a few different nodes in our graph. In langgraph, a node can be either a function or a runnable. There are two main nodes we need for this:

1. The agent: responsible for deciding what (if any) actions to take.
2. A function to invoke tools: if the agent decides to take an action, this node will then execute that action.

We will also need to define some edges. Some of these edges may be conditional. The reason they are conditional is that based on the output of a node, one of several paths may be taken. The path that is taken is not known until that node is run (the LLM decides).

1. Conditional Edge: after the agent is called, we should either: a. If the agent said to take an action, then the function to invoke tools should be called\ b. If the agent said that it was finished, then it should finish
2. Normal Edge: after the tools are invoked, it sho

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>