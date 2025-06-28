How to add multi-turn conversation in a multi-agent application

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add multi-turn conversation in a multi-agent application¶

Prerequisites

This guide assumes familiarity with the following:

* Node
* Command
* Multi-agent systems
* Human-in-the-loop

In this how-to guide, we’ll build an application that allows an end-user to engage in a multi-turn conversation with one or more agents. We'll create a node that uses an interrupt to collect user input and routes back to the active agent.

The agents will be implemented as nodes in a graph that executes agent steps and determines the next action:

1. Wait for user input to continue the conversation, or
2. Route to another agent (or back to itself, such as in a loop) via a handoff.

```
function human(state: typeof MessagesAnnotation.State): Command { const userInput: string = interrupt("Ready for user input."); // Determine the active agent const activeAgent = ...; return new Command({ update: { messages: [{ role: "human", content: userInput, }] }, goto: activeAgent, }); } function agent(state: typeof MessagesAnnotation.State): Command { // The condition for routing/halting can be anything, // e.g. LLM tool call / structured output, etc. const goto = getNextAgent(...); // "agent" / "anotherAgent" if (goto) { return new Command({ goto, update: { myStateKey: "myStateValue" } }); } else { return new Command({ goto: "human" }); } }
```

## Setup¶

First, let's install the required packages npm install langchain/langgraph langchain/openai langchain/core uuid zod

```
// process.env.OPENAI_API_KEY = "sk_..."; // Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "ls__..."; process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; process.env.LANGCHAIN_TRACING_V2 = "true"; process.env.LANGCHAIN_PROJECT = "Time Travel: LangGraphJS";
```

```
Time Travel: LangGraphJS
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here.

## Travel Recommendations Example¶

In this example, we will build a team of travel assistant agents that can communicate with each other via handoffs.

We will create 3 agents:

* travelAdvisor: can help with general travel destination recommendations. Can ask sightseeingAdvisor and hotelAdvisor for help.
* sightseeingAdvisor: can help with sightseeing recommendations. Can ask travelAdvisor and hotelAdvisor for help.
* hotelAdvisor: can help with hotel recommendations. Can ask travelAdvisor and hotelAdvisor for help.

This is a fully-connected network - every agent can talk to any other agent.

To implement the handoffs between the agents we'll be using LLMs with structured output. Each agent's LLM will return an output with both its text response (response) as well as which agent to route to next (goto). If the agent has enough information to respond to the user, the goto will be set to human to route back and collect information from a human.

Now, let's define our agent nodes and graph!

```
import { z } from "zod"; import { ChatOpenAI } from "@langchain/openai"; import { BaseMessage } from "@langchain/core/messages"; import { MessagesAnnotation, StateGraph, START, Command, interrupt, MemorySaver } from "@langchain/langgraph"; const model = new ChatOpenAI({ model: "gpt-4o" }); /** * Call LLM with structured output to get a natural language response as well as a target agent (node) to go to next. * @param messages list of messages to pass to the LLM * @param targetAgentNodes list of the node names of the target agents to navigate to */ function callLlm(messages: BaseMessage[], targetAgentNodes: string[]) { // define the schema for the structured output: // - model's text response (`response`) // - name of the node to go to next (or 'finish') const outputSchema = z.object({ response: z.string().describe("A human readable response to the original question. Does not need to be a final response. Will be streamed back to the user."), goto: z.enum(["finish", ...targetAgentNodes]).describe("The next agent to call, or 'finish' if the user's query has been resolved. Must be one of the specified values."), }) return model.withStructuredOutput(outputSchema, { name: "Response" }).invoke(messages) } async function travelAdvisor( state: typeof MessagesAnnotation.State ): Promise<Command> { const systemPrompt = "You are a general travel expert that can recommend travel destinations (e.g. countries, cities, etc). " + "If you need specific sightseeing recommendations, ask 'sightseeingAdvisor' for help. " + "If you need hotel recommendations, ask 'hotelAdvisor' for help. " + "If you have enough information to respond to the user, return 'finish'. " + "Never mention other agents by name."; const messages = [

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>