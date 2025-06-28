How to build a multi-agent network (functional API)

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to build a multi-agent network (functional API)¶

Prerequisites

This guide assumes familiarity with the following:

* Multi-agent systems
* Functional API
* Command
* LangGraph Glossary

In this how-to guide we will demonstrate how to implement a multi-agent network architecture where each agent can communicate with every other agent (many-to-many connections) and can decide which agent to call next. We will be using LangGraph's functional API — individual agents will be defined as tasks and the agent handoffs will be defined in the main entrypoint():

```
import { entrypoint, task } from "@langchain/langgraph"; import { createReactAgent } from "@langchain/langgraph/prebuilt"; import { tool } from "@langchain/core/tools"; import { z } from "zod"; // Define a tool to signal intent to hand off to a different agent const transferToHotelAdvisor = tool(async () => { return "Successfully transferred to hotel advisor"; }, { name: "transferToHotelAdvisor", description: "Ask hotel advisor agent for help.", schema: z.object({}), returnDirect: true, }); // define an agent const travelAdvisorTools = [transferToHotelAdvisor, ...]; const travelAdvisor = createReactAgent({ llm: model, tools: travelAdvisorTools, }); // define a task that calls an agent const callTravelAdvisor = task("callTravelAdvisor", async (messages: BaseMessage[]) => { const response = travelAdvisor.invoke({ messages }); return response.messages; }); const networkGraph = entrypoint( { name: "networkGraph" }, async (messages: BaseMessageLike[]) => { let callActiveAgent = callTravelAdvisor; let agentMessages; while (true) { agentMessages = await callActiveAgent(messages); messages = addMessages(messages, agentMessages); callActiveAgent = getNextAgent(messages); } return messages; });
```

## Setup¶

Note

This guide requires @langchain/langgraph>=0.2.42.

First, install the required dependencies for this example:

```
npm install @langchain/langgraph @langchain/anthropic @langchain/core zod
```

Next, we need to set API keys for Anthropic (the LLM we will use):

```
process.env.ANTHROPIC_API_KEY = "YOUR_API_KEY";
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here

## Travel agent example¶

In this example we will build a team of travel assistant agents that can communicate with each other.

We will create 2 agents:

* travelAdvisor: can help with travel destination recommendations. Can ask hotelAdvisor for help.
* hotelAdvisor: can help with hotel recommendations. Can ask travelAdvisor for help.

This is a fully-connected network - every agent can talk to any other agent.

First, let's create some of the tools that the agents will be using:

```
import { tool } from "@langchain/core/tools"; import { z } from "zod"; // Tool for getting travel recommendations const getTravelRecommendations = tool(async () => { const destinations = ["aruba", "turks and caicos"]; return destinations[Math.floor(Math.random() * destinations.length)]; }, { name: "getTravelRecommendations", description: "Get recommendation for travel destinations", schema: z.object({}), }); // Tool for getting hotel recommendations const getHotelRecommendations = tool(async (input: { location: "aruba" | "turks and caicos" }) => { const recommendations = { "aruba": [ "The Ritz-Carlton, Aruba (Palm Beach)", "Bucuti & Tara Beach Resort (Eagle Beach)" ], "turks and caicos": ["Grace Bay Club", "COMO Parrot Cay"] }; return recommendations[input.location]; }, { name: "getHotelRecommendations", description: "Get hotel recommendations for a given destination.", schema: z.object({ location: z.enum(["aruba", "turks and caicos"]) }), }); // Define a tool to signal intent to hand off to a different agent // Note: this is not using Command(goto) syntax for navigating to different agents: // `workflow()` below handles the handoffs explicitly const transferToHotelAdvisor = tool(async () => { return "Successfully transferred to hotel advisor"; }, { name: "transferToHotelAdvisor", description: "Ask hotel advisor agent for help.", schema: z.object({}), // Hint to our agent implementation that it should stop // immediately after invoking this tool returnDirect: true, }); const transferToTravelAdvisor = tool(async () => { return "Successfully transferred to travel advisor"; }, { name: "transferToTravelAdvisor", description: "Ask travel advisor agent for help.", schema: z.object({}), // Hint to our agent implementation that it should stop // immediately after invoking this tool returnDirect: true, });
```

Transfer tools

You might have noticed that we're using tool(... { returnDirect: true }) in the transfer tools. Thi

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>