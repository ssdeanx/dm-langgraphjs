Learn the basics

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# LangGraph.js - Quickstart¶

## Introduction¶

In this quickstart guide, you'll get up and running with a simple Reason + Act Agent (often called a ReAct Agent) that can search the web using Tavily Search API. The code is fully configurable. You can:

* swap out components
* customize the execution flow
* extend it with custom code or tooling
* change the Large Language Model (LLM) and provider being used

## Prerequisites¶

To follow along, you'll need to have the following:

* NodeJS version 18 or newer
* A Tavily account and API key
* An OpenAI developer platform account and API key

Start by creating a new folder for the project. Open your terminal and run the following code:

```
mkdir langgraph-agent cd langgraph-agent
```

You'll also need to install a few dependencies to create an agent:

* @langchain/langgraph contains the building blocks used to assemble an agent
* @langchain/openai enable your agent to use OpenAI's LLMs
* @langchain/community includes the Tavily integration give your agent search capabilities

You can install these dependencies using by running following npm command in your terminal:

```
npm install @langchain/core @langchain/langgraph @langchain/openai @langchain/community
```

## LangSmith¶

Optionally, set up LangSmith for best-in-class observability. Setup is simple - add the following variables to your environment and update the LANGCHAIN\_API\_KEY value with your API key.

```
// Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "ls__..."; // process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; // process.env.LANGCHAIN_TRACING_V2 = "true"; // process.env.LANGCHAIN_PROJECT = "Quickstart: LangGraphJS";
```

## Making your first agent using LangGraph¶

Create a file named agent.mts (short for Reason + Act Agent) and add the below TypeScript code to it.

Make sure you update the environment variables at the top of the file to contain your API keys. If you don't, the OpenAI and Tavily API calls will produce errors and your agent will not work correctly.

Once you've added your API keys, save the file and run the code with the following command:

```
npx tsx agent.mts
```

```
// agent.mts // IMPORTANT - Add your API keys here. Be careful not to publish them. process.env.OPENAI_API_KEY = "sk-..."; process.env.TAVILY_API_KEY = "tvly-..."; import { TavilySearchResults } from "@langchain/community/tools/tavily_search"; import { ChatOpenAI } from "@langchain/openai"; import { MemorySaver } from "@langchain/langgraph"; import { HumanMessage } from "@langchain/core/messages"; import { createReactAgent } from "@langchain/langgraph/prebuilt"; // Define the tools for the agent to use const agentTools = [new TavilySearchResults({ maxResults: 3 })]; const agentModel = new ChatOpenAI({ temperature: 0 }); // Initialize memory to persist state between graph runs const agentCheckpointer = new MemorySaver(); const agent = createReactAgent({ llm: agentModel, tools: agentTools, checkpointSaver: agentCheckpointer, }); // Now it's time to use! const agentFinalState = await agent.invoke( { messages: [new HumanMessage("what is the current weather in sf")] }, { configurable: { thread_id: "42" } }, ); console.log( agentFinalState.messages[agentFinalState.messages.length - 1].content, ); const agentNextState = await agent.invoke( { messages: [new HumanMessage("what about ny")] }, { configurable: { thread_id: "42" } }, ); console.log( agentNextState.messages[agentNextState.messages.length - 1].content, );
```

```
The current weather in San Francisco is as follows: - Temperature: 82.0°F (27.8°C) - Condition: Sunny - Wind: 11.9 mph from the NW - Humidity: 41% - Pressure: 29.98 in - Visibility: 9.0 miles - UV Index: 6.0 For more details, you can visit [Weather in San Francisco](https://www.weatherapi.com/). The current weather in New York is as follows: - Temperature: 84.0°F (28.9°C) - Condition: Sunny - Wind: 2.2 mph from SSE - Humidity: 57% - Pressure: 29.89 in - Precipitation: 0.01 in - Visibility: 9.0 miles - UV Index: 6.0 For more details, you can visit [Weather in New York](https://www.weatherapi.com/).
```

## How does it work?¶

The createReactAgent constructor lets you create a simple tool-using LangGraph agent in a single line of code. Here's a visual representation of the graph:

```
// Note: tslab only works inside a jupyter notebook. Don't worry about running this code yourself! import * as tslab from "tslab"; const graph = agent.getGraph(); const image = await graph.drawMermaidPng(); const arrayBuffer = await image.arrayBuffer(); await tslab.display.png(new Uint8Array(arrayBuffer));
```

Alternatively, you can save the graph as a PNG file locally using the following approach:

```
import { writeFileSync } from "node:fs"; const graphStateImage = await drawableGraphGraphState.drawMermaidPng(); const graphStateArrayBuffer = await graphStateImage.arrayB

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>