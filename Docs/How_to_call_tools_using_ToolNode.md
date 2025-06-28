How to call tools using ToolNode

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to call tools using ToolNode

This guide covers how to use LangGraph's prebuilt ToolNode for tool calling.

ToolNode is a LangChain Runnable that takes graph state (with a list of messages) as input and outputs state update with the result of tool calls. It is designed to work well out-of-box with LangGraph's prebuilt ReAct agent, but can also work with any StateGraph as long as its state has a messages key with an appropriate reducer (see MessagesAnnotation).

## Setup

```
npm install @langchain/langgraph @langchain/anthropic @langchain/core zod
```

Set env vars:

```
process.env.ANTHROPIC_API_KEY = 'your-anthropic-api-key';
```

## Define tools

```
import { tool } from '@langchain/core/tools'; import { z } from 'zod'; const getWeather = tool((input) => { if (['sf', 'san francisco'].includes(input.location.toLowerCase())) { return 'It\'s 60 degrees and foggy.'; } else { return 'It\'s 90 degrees and sunny.'; } }, { name: 'get_weather', description: 'Call to get the current weather.', schema: z.object({ location: z.string().describe("Location to get the weather for."), }) }) const getCoolestCities = tool(() => { return 'nyc, sf'; }, { name: 'get_coolest_cities', description: 'Get a list of coolest cities', schema: z.object({ noOp: z.string().optional().describe("No-op parameter."), }) })