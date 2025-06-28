How to have agent respond in structured format

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to have agent respond in structured format¶

The typical ReAct agent prompts the LLM to respond in 1 of two formats: a function call (~ JSON) to use a tool, or conversational text to respond to the user.

If your agent is connected to a structured (or even generative) UI, or if it is communicating with another agent or software process, you may want it to resopnd in a specific structured format.

In this example we will build a conversational ReAct agent that responds in a specific format. We will do this by using tool calling. This is useful when you want to enforce that an agent's response is in a specific format. In this example, we will ask it respond as if it were a weatherman, returning the temperature and additional info in separate, machine-readable fields.

## Setup¶

First we need to install the packages required

```
yarn add langchain @langchain/anthropic @langchain/langgraph @langchain/core
```

Next, we need to set API keys for OpenAI (the LLM we will use).

```
// process.env.OPENAI_API_KEY = "sk_...";
```

Optionally, we can set API key for LangSmith tracing, which will give us best-in-class observability.

```
// process.env.LANGCHAIN_API_KEY = "ls..."; process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; process.env.LANGCHAIN_TRACING_V2 = "true"; process.env.LANGCHAIN_PROJECT = "Respond in Format: LangGraphJS";
```

```
Respond in Format: LangGraphJS
```

## Set up the State¶

```
import { Annotation, messagesStateReducer } from "@langchain/langgraph"; import { BaseMessage } from "@langchain/core/messages"; const GraphState = Annotation.Root({ messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer, }), });
```

## Set up the tools¶

```
import { tool } from "@langchain/core/tools"; import { z } from "zod"; const searchTool = tool((_) => { // This is a placeholder, but don't tell the LLM that... return "67 degrees. Cloudy with a chance of rain."; }, { name: "search", description: "Call to surf the web.", schema: z.object({ query: z.string().describe("The query to use in your search."), }), }); const tools = [searchTool];
```

We can now wrap these tools in a ToolNode.

```
import { ToolNode } from "@langchain/langgraph/prebuilt"; const toolNode = new ToolNode<typeof GraphState.State>(tools);
```

## Set up the model¶

```
import { ChatOpenAI } from "@langchain/openai"; const model = new ChatOpenAI({ temperature: 0, model: "gpt-4o", });
```

After we've done this, we should make sure the model knows that it has these tools available to call. We can do this by binding the LangChain tools to the model class.

We also want to define a response schema for the language model and bind it to the model as a tool. The idea is that when the model is ready to respond, it'll call this final tool and populate arguments for it according to the schema we want. Rather than calling a tool, we'll instead return from the graph.

Because we only intend to use this final tool to guide the schema of the model's final response, we'll declare it with a mocked out function:

```
import { tool } from "@langchain/core/tools"; const Response = z.object({ temperature: z.number().describe("the temperature"), other_notes: z.string().describe("any other notes about the weather"), }); const finalResponseTool = tool(async () => "mocked value", { name: "Response", description: "Always respond to the user using this tool.", schema: Response }) const boundModel = model.bindTools([ ...tools, finalResponseTool ]);
```

## Define the nodes¶

```
import { AIMessage } from "@langchain/core/messages"; import { RunnableConfig } from "@langchain/core/runnables"; // Define the function that determines whether to continue or not const route = (state: typeof GraphState.State) => { const { messages } = state; const lastMessage = messages[messages.length - 1] as AIMessage; // If there is no function call, then we finish if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) { return "__end__"; } // Otherwise if there is, we need to check what type of function call it is if (lastMessage.tool_calls[0].name === "Response") { return "__end__"; } // Otherwise we continue return "tools"; }; // Define the function that calls the model const callModel = async ( state: typeof GraphState.State, config?: RunnableConfig, ) => { const { messages } = state; const response = await boundModel.invoke(messages, config); // We return an object, because this will get added to the existing list return { messages: [response] }; };
```

## Define the graph¶

```
import { StateGraph } from "@langchain/langgraph"; // Define a new graph const workflow = new StateGraph(GraphState) .addNode("agent", callModel) .addNode("tools", toolNode) .addEdge("__start__", "agent") .addConditionalEdges( // First, we define the start node. We use `agent`. // This means these are the edges taken afte

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>