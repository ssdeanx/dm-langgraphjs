How to add a custom system prompt to the prebuilt ReAct agent

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add a custom system prompt to the prebuilt ReAct agent¶

This tutorial will show how to add a custom system prompt to the prebuilt ReAct agent. Please see this tutorial for how to get started with the prebuilt ReAct agent

You can add a custom system prompt by passing a string to the stateModifier param.

Compatibility

The stateModifier parameter was added in @langchain/langgraph>=0.2.27. If you are on an older version, you will need to use the deprecated messageModifier parameter. For help upgrading, see this guide.

## Setup¶

First, we need to install the required packages.

```
yarn add @langchain/langgraph @langchain/openai @langchain/core
```

This guide will use OpenAI's GPT-4o model. We will optionally set our API key for LangSmith tracing, which will give us best-in-class observability.

```
// process.env.OPENAI_API_KEY = "sk_..."; // Optional, add tracing in LangSmith // process.env.LANGCHAIN_API_KEY = "ls__..." // process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "true"; process.env.LANGCHAIN_TRACING_V2 = "true"; process.env.LANGCHAIN_PROJECT = "ReAct Agent with system prompt: LangGraphJS";
```

```
ReAct Agent with system prompt: LangGraphJS
```

## Code¶

Now we can use the prebuilt createReactAgent function to setup our agent with a system prompt:

```
import { ChatOpenAI } from "@langchain/openai"; import { tool } from '@langchain/core/tools'; import { z } from 'zod'; import { createReactAgent } from "@langchain/langgraph/prebuilt"; const model = new ChatOpenAI({ model: "gpt-4o", }); const getWeather = tool((input) => { if (input.location === 'sf') { return 'It\'s always sunny in sf'; } else { return 'It might be cloudy in nyc'; } }, { name: 'get_weather', description: 'Call to get the current weather.', schema: z.object({ location: z.enum(['sf','nyc']).describe("Location to get the weather for."), }) }) // We can add our system prompt here const prompt = "Respond in Italian" const agent = createReactAgent({ llm: model, tools: [getWeather], stateModifier: prompt });
```

## Usage¶

Let's verify that the agent does indeed respond in Italian!

```
let inputs = { messages: [{ role: "user", content: "what is the weather in NYC?" }] }; let stream = await agent.stream(inputs, { streamMode: "values", }); for await ( const { messages } of stream ) { let msg = messages[messages?.length - 1]; if (msg?.content) { console.log(msg.content); } else if (msg?.tool_calls?.length > 0) { console.log(msg.tool_calls); } else { console.log(msg); } console.log("-----\n"); } 
```

```
what is the weather in NYC? ----- [ { name: 'get_weather', args: { location: 'nyc' }, type: 'tool_call', id: 'call_PqmKDQrefHQLmGsZSSr4C7Fc' } ] ----- It might be cloudy in nyc ----- A New York potrebbe essere nuvoloso. Hai altre domande o posso aiutarti in qualcos'altro? -----
```

Copyright © 2025 LangChain, Inc | Consent Preferences

Made with Material for MkDocs Insiders