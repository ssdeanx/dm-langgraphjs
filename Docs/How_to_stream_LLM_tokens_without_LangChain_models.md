How to stream LLM tokens (without LangChain models)

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to stream LLM tokens (without LangChain models)¶

In this guide, we will stream tokens from the language model powering an agent without using LangChain chat models. We'll be using the OpenAI client library directly in a ReAct agent as an example.

## Setup¶

To get started, install the openai and langgraph packages separately:

```
$ npm install openai @langchain/langgraph @langchain/core
```

Compatibility

This guide requires @langchain/core>=0.2.19, and if you are using LangSmith, langsmith>=0.1.39. For help upgrading, see this guide.

You'll also need to make sure you have your OpenAI key set as process.env.OPENAI\_API\_KEY.

## Defining a model and a tool schema¶

First, initialize the OpenAI SDK and define a tool schema for the model to populate using OpenAI's format:

```
import OpenAI from "openai"; const openaiClient = new OpenAI({}); const toolSchema: OpenAI.ChatCompletionTool = { type: "function", function: { name: "get_items", description: "Use this tool to look up which items are in the given place.", parameters: { type: "object", properties: { place: { type: "string", }, }, required: ["place"], } } };
```

## Calling the model¶

Now, define a method for a LangGraph node that will call the model. It will handle formatting tool calls to and from the model, as well as streaming via custom callback events.

If you are using LangSmith, you can also wrap the OpenAI client for the same nice tracing you'd get with a LangChain chat model.

Here's what that looks like:

```
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch"; import { wrapOpenAI } from "langsmith/wrappers/openai"; import { Annotation } from "@langchain/langgraph"; const StateAnnotation = Annotation.Root({ messages: Annotation<OpenAI.ChatCompletionMessageParam[]>({ reducer: (x, y) => x.concat(y), }), }); // If using LangSmith, use "wrapOpenAI" on the whole client or // "traceable" to wrap a single method for nicer tracing: // https://docs.smith.langchain.com/how_to_guides/tracing/annotate_code const wrappedClient = wrapOpenAI(openaiClient); const callModel = async (state: typeof StateAnnotation.State) => { const { messages } = state; const stream = await wrappedClient.chat.completions.create({ messages, model: "gpt-4o-mini", tools: [toolSchema], stream: true, }); let responseContent = ""; let role: string = "assistant"; let toolCallId: string | undefined; let toolCallName: string | undefined; let toolCallArgs = ""; for await (const chunk of stream) { const delta = chunk.choices[0].delta; if (delta.role !== undefined) { role = delta.role; } if (delta.content) { responseContent += delta.content; await dispatchCustomEvent("streamed_token", { content: delta.content, }); } if (delta.tool_calls !== undefined && delta.tool_calls.length > 0) { // note: for simplicity we're only handling a single tool call here const toolCall = delta.tool_calls[0]; if (toolCall.function?.name !== undefined) { toolCallName = toolCall.function.name; } if (toolCall.id !== undefined) { toolCallId = toolCall.id; } await dispatchCustomEvent("streamed_tool_call_chunk", toolCall); toolCallArgs += toolCall.function?.arguments ?? ""; } } let finalToolCalls; if (toolCallName !== undefined && toolCallId !== undefined) { finalToolCalls = [{ id: toolCallId, function: { name: toolCallName, arguments: toolCallArgs }, type: "function" as const, }]; } const responseMessage = { role: role as any, content: responseContent, tool_calls: finalToolCalls, }; return { messages: [responseMessage] }; }
```

Note that you can't call this method outside of a LangGraph node since dispatchCustomEvent will fail if it is called outside the proper context.

## Define tools and a tool-calling node¶

Next, set up the actual tool function and the node that will call it when the model populates a tool call:

```
const getItems = async ({ place }: { place: string }) => { if (place.toLowerCase().includes("bed")) { // For under the bed return "socks, shoes and dust bunnies"; } else if (place.toLowerCase().includes("shelf")) { // For 'shelf' return "books, pencils and pictures"; } else { // if the agent decides to ask about a different place return "cat snacks"; } }; const callTools = async (state: typeof StateAnnotation.State) => { const { messages } = state; const mostRecentMessage = messages[messages.length - 1]; const toolCalls = (mostRecentMessage as OpenAI.ChatCompletionAssistantMessageParam).tool_calls; if (toolCalls === undefined || toolCalls.length === 0) { throw new Error("No tool calls passed to node."); } const toolNameMap = { get_items: getItems, }; const functionName = toolCalls[0].function.name; const functionArguments = JSON.parse(toolCalls[0].function.arguments); const response = await toolNameMap[functionName](functionArguments); const toolMessage = { tool_call_id: toolCalls[0].id, role: "tool" as const

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>