How to update graph state from tools

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to update graph state from tools¶

Prerequisites

This guide assumes familiarity with the following:

* Command

A common use case is updating graph state from inside a tool. For example, in a customer support application you might want to look up customer account number or ID in the beginning of the conversation. To update the graph state from the tool, you can return a Command object from the tool:

```
import { tool } from "@langchain/core/tools"; const lookupUserInfo = tool(async (input, config) => { const userInfo = getUserInfo(config); return new Command({ // update state keys update: { user_info: userInfo, messages: [ new ToolMessage({ content: "Successfully looked up user information", tool_call_id: config.toolCall.id, }), ], }, }); }, { name: "lookup_user_info", description: "Use this to look up user information to better assist them with their questions.", schema: z.object(...) });
```

Important

If you want to use tools that return Command instances and update graph state, you can either use prebuilt createReactAgent / ToolNode components, or implement your own tool-executing node that identifies Command objects returned by your tools and returns a mixed array of traditional state updates and Commands. See this section for an example.

This guide shows how you can do this using LangGraph's prebuilt components (createReactAgent and ToolNode).

Compatibility

This guide requires @langchain/langgraph>=0.2.33 and @langchain/core@0.3.23. For help upgrading, see this guide.

## Setup¶

Install the following to run this guide:

```
npm install @langchain/langgraph @langchain/openai @langchain/core
```

Next, configure your environment to connect to your model provider.

```
export OPENAI_API_KEY=your-api-key
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here.

Let's create a simple ReAct style agent that can look up user information and personalize the response based on the user info.

## Define tool¶

First, let's define the tool that we'll be using to look up user information. We'll use a naive implementation that simply looks user information up using a dictionary:

```
const USER_ID_TO_USER_INFO = { abc123: { user_id: "abc123", name: "Bob Dylan", location: "New York, NY", }, zyx987: { user_id: "zyx987", name: "Taylor Swift", location: "Beverly Hills, CA", }, };
```

```
import { Annotation, Command, MessagesAnnotation } from "@langchain/langgraph"; import { tool } from "@langchain/core/tools"; import { z } from "zod"; const StateAnnotation = Annotation.Root({ ...MessagesAnnotation.spec, // user provided lastName: Annotation<string>, // updated by the tool userInfo: Annotation<Record<string, any>>, }); const lookupUserInfo = tool(async (_, config) => { const userId = config.configurable?.user_id; if (userId === undefined) { throw new Error("Please provide a user id in config.configurable"); } if (USER_ID_TO_USER_INFO[userId] === undefined) { throw new Error(`User "${userId}" not found`); } // Populated when a tool is called with a tool call from a model as input const toolCallId = config.toolCall.id; return new Command({ update: { // update the state keys userInfo: USER_ID_TO_USER_INFO[userId], // update the message history messages: [ { role: "tool", content: "Successfully looked up user information", tool_call_id: toolCallId, }, ], }, }) }, { name: "lookup_user_info", description: "Always use this to look up information about the user to better assist them with their questions.", schema: z.object({}), });
```

## Define prompt¶

Let's now add personalization: we'll respond differently to the user based on the state values AFTER the state has been updated from the tool. To achieve this, let's define a function that will dynamically construct the system prompt based on the graph state. It will be called ever time the LLM is called and the function output will be passed to the LLM:

```
const stateModifier = (state: typeof StateAnnotation.State) => { const userInfo = state.userInfo; if (userInfo == null) { return state.messages; } const systemMessage = `User name is ${userInfo.name}. User lives in ${userInfo.location}`; return [{ role: "system", content: systemMessage, }, ...state.messages]; };
```

## Define graph¶

Finally, let's combine this into a single graph using the prebuilt createReactAgent and the components we declared earlier:

```
import { createReactAgent } from "@langchain/langgraph/prebuilt"; import { ChatOpenAI } from "@langchain/openai"; const model = new ChatOpenAI({ model: "gpt-4o", }); const agent = createReactAgent({ llm: model, tools: [lookupUserInfo], stateSchema: StateAnnotation, stateModifier:

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>