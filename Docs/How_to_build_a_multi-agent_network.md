How to build a multi-agent network

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to build a multi-agent network¶

Prerequisites

This guide assumes familiarity with the following:

* Nodes
* Command
* Multi-agent systems

This functionality also requires @langchain/langgraph>=0.2.29.

In this how-to guide we will demonstrate how to implement a multi-agent network architecture.

Each agent can be represented as a node in the graph that executes agent step(s) and decides what to do next - finish execution or route to another agent (including routing to itself, e.g. running in a loop). A common pattern for routing in multi-agent architectures is handoffs. Handoffs allow you to specify:

1. which agent to navigate to next and (e.g. name of the node to go to)
2. what information to pass to that agent (e.g. state update)

To implement handoffs, agent nodes can return Command object that allows you to combine both control flow and state updates:

```
const agent = async (state) => { // the condition for routing/halting can be anything // e.g. LLM tool call / structured output, etc. const goto = getNextAgent(...); // "agent" / "another_agent" if (goto) { return new Command({ goto, update: { myStateKey: "my_state_value", } }); } ... }
```

## Setup¶

First, let's install the required packages:

```
yarn add @langchain/langgraph @langchain/openai @langchain/core zod
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here.

## Travel Recommendations Example¶

In this example we will build a team of travel assistant agents that can communicate with each other via handoffs.

We will create 3 agents:

* travel\_advisor: can help with general travel destination recommendations. Can ask sightseeing\_advisor and hotel\_advisor for help.
* sightseeing\_advisor: can help with sightseeing recommendations. Can ask travel\_advisor and hotel\_advisor for help.
* hotel\_advisor: can help with hotel recommendations. Can ask sightseeing\_advisor and hotel\_advisor for help.

This is a fully-connected network - every agent can talk to any other agent.

To implement the handoffs between the agents we'll be using LLMs with structured output. Each agent's LLM will return an output with both its text response (response) as well as which agent to route to next (goto). If the agent has enough information to respond to the user, goto will contain finish.

Now, let's define our agent nodes and graph!

```
import { ChatOpenAI } from "@langchain/openai"; import { Command, MessagesAnnotation, StateGraph } from "@langchain/langgraph"; import { z } from "zod"; const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0.1, }); const makeAgentNode = (params: { name: string, destinations: string[], systemPrompt: string }) => { return async (state: typeof MessagesAnnotation.State) => { const possibleDestinations = ["__end__", ...params.destinations] as const; // define schema for the structured output: // - model's text response (`response`) // - name of the node to go to next (or '__end__') const responseSchema = z.object({ response: z.string().describe( "A human readable response to the original question. Does not need to be a final response. Will be streamed back to the user." ), goto: z.enum(possibleDestinations).describe("The next agent to call, or __end__ if the user's query has been resolved. Must be one of the specified values."), }); const messages = [ { role: "system", content: params.systemPrompt }, ...state.messages, ]; const response = await model.withStructuredOutput(responseSchema, { name: "router", }).invoke(messages); // handoff to another agent or halt const aiMessage = { role: "assistant", content: response.response, name: params.name, }; return new Command({ goto: response.goto, update: { messages: aiMessage } }); } }; const travelAdvisor = makeAgentNode({ name: "travel_advisor", destinations: ["sightseeing_advisor", "hotel_advisor"], systemPrompt: [ "You are a general travel expert that can recommend travel destinations (e.g. countries, cities, etc). ", "If you need specific sightseeing recommendations, ask 'sightseeing_advisor' for help. ", "If you need hotel recommendations, ask 'hotel_advisor' for help. ", "If you have enough information to respond to the user, return '__end__'. ", "Never mention other agents by name." ].join(""), }); const sightseeingAdvisor = makeAgentNode({ name: "sightseeing_advisor", destinations: ["travel_advisor", "hotel_advisor"], systemPrompt: [ "You are a travel expert that can provide specific sightseeing recommendations for a given destination. ", "If you need general travel help, go to 'travel_advisor' for help. ", "If you need hotel recommendations, go to 'hotel_advisor' for help. ", "If you have e

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>