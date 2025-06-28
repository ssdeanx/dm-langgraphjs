How to add multi-turn conversation in a multi-agent application (functional API)

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add multi-turn conversation in a multi-agent application (functional API)¶

Prerequisites

This guide assumes familiarity with the following:

* Multi-agent systems
* Human-in-the-loop
* Functional API
* Command
* LangGraph Glossary

In this how-to guide, we’ll build an application that allows an end-user to engage in a multi-turn conversation with one or more agents. We'll create a node that uses an interrupt to collect user input and routes back to the active agent.

The agents will be implemented as tasks in a workflow that executes agent steps and determines the next action:

1. Wait for user input to continue the conversation, or
2. Route to another agent (or back to itself, such as in a loop) via a handoff.

Note

This guide requires @langchain/langgraph>=0.2.42 and @langchain/core>=0.3.36.

## Setup¶

First, install the required dependencies for this example:

```
npm install @langchain/langgraph @langchain/anthropic @langchain/core uuid zod
```

Next, we need to set API keys for Anthropic (the LLM we will use):

```
process.env.ANTHROPIC_API_KEY = "YOUR_API_KEY";
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here

In this example we will build a team of travel assistant agents that can communicate with each other.

We will create 2 agents:

* travelAdvisor: can help with travel destination recommendations. Can ask hotelAdvisor for help.
* hotelAdvisor: can help with hotel recommendations. Can ask travelAdvisor for help.

This is a fully-connected network - every agent can talk to any other agent.

```
import { tool } from "@langchain/core/tools"; import { z } from "zod"; // Tool for getting travel recommendations const getTravelRecommendations = tool(async () => { const destinations = ["aruba", "turks and caicos"]; return destinations[Math.floor(Math.random() * destinations.length)]; }, { name: "getTravelRecommendations", description: "Get recommendation for travel destinations", schema: z.object({}), }); // Tool for getting hotel recommendations const getHotelRecommendations = tool(async (input: { location: "aruba" | "turks and caicos" }) => { const recommendations = { "aruba": [ "The Ritz-Carlton, Aruba (Palm Beach)", "Bucuti & Tara Beach Resort (Eagle Beach)" ], "turks and caicos": ["Grace Bay Club", "COMO Parrot Cay"] }; return recommendations[input.location]; }, { name: "getHotelRecommendations", description: "Get hotel recommendations for a given destination.", schema: z.object({ location: z.enum(["aruba", "turks and caicos"]) }), }); // Define a tool to signal intent to hand off to a different agent // Note: this is not using Command(goto) syntax for navigating to different agents: // `workflow()` below handles the handoffs explicitly const transferToHotelAdvisor = tool(async () => { return "Successfully transferred to hotel advisor"; }, { name: "transferToHotelAdvisor", description: "Ask hotel advisor agent for help.", schema: z.object({}), // Hint to our agent implementation that it should stop // immediately after invoking this tool returnDirect: true, }); const transferToTravelAdvisor = tool(async () => { return "Successfully transferred to travel advisor"; }, { name: "transferToTravelAdvisor", description: "Ask travel advisor agent for help.", schema: z.object({}), // Hint to our agent implementation that it should stop // immediately after invoking this tool returnDirect: true, });
```

Transfer tools

You might have noticed that we're using tool(... { returnDirect: true }) in the transfer tools. This is done so that individual agents (e.g., travelAdvisor) can exit the ReAct loop early once these tools are called without calling the model a final time to process the result of the tool call. This is the desired behavior, as we want to detect when the agent calls this tool and hand control off immediately to a different agent.

NOTE: This is meant to work with the prebuilt createReactAgent - if you are building a custom agent, make sure to manually add logic for handling early exit for tools that are marked with returnDirect.

Let's now create our agents using the prebuilt createReactAgent and our multi-agent workflow. Note that will be calling interrupt every time after we get the final response from each of the agents.

```
import { AIMessage, type BaseMessage, type BaseMessageLike } from "@langchain/core/messages"; import { ChatAnthropic } from "@langchain/anthropic"; import { createReactAgent } from "@langchain/langgraph/prebuilt"; import { addMessages, entrypoint, task, MemorySaver, interrupt, } from "@langchain/langgraph"; const model = new ChatAnthropic(

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>