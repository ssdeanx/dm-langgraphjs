How to wait for user input (Functional API)

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to wait for user input (Functional API)¶

Prerequisites

This guide assumes familiarity with the following:

* Implementing human-in-the-loop workflows with interrupt
* How to create a ReAct agent using the Functional API

Human-in-the-loop (HIL) interactions are crucial for agentic systems. Waiting for human input is a common HIL interaction pattern, allowing the agent to ask the user clarifying questions and await input before proceeding.

We can implement this in LangGraph using the interrupt() function. interrupt allows us to stop graph execution to collect input from a user and continue execution with collected input.

This guide demonstrates how to implement human-in-the-loop workflows using LangGraph's Functional API. Specifically, we will demonstrate:

1. A simple usage example
2. How to use with a ReAct agent

## Setup¶

Note

This guide requires @langchain/langgraph>=0.2.42.

First, install the required dependencies for this example:

```
npm install @langchain/langgraph @langchain/openai @langchain/core zod
```

Next, we need to set API keys for OpenAI (the LLM we will use):

```
process.env.OPENAI_API_KEY = "YOUR_API_KEY";
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here

## Simple usage¶

Let's demonstrate a simple usage example. We will create three tasks:

1. Append "bar".
2. Pause for human input. When resuming, append human input.
3. Append "qux".

```
import { task, interrupt } from "@langchain/langgraph"; const step1 = task("step1", async (inputQuery: string) => { return `${inputQuery} bar`; }); const humanFeedback = task( "humanFeedback", async (inputQuery: string) => { const feedback = interrupt(`Please provide feedback: ${inputQuery}`); return `${inputQuery} ${feedback}`; }); const step3 = task("step3", async (inputQuery: string) => { return `${inputQuery} qux`; });
```

We can now compose these tasks in a simple entrypoint:

```
import { MemorySaver, entrypoint } from "@langchain/langgraph"; const checkpointer = new MemorySaver(); const graph = entrypoint({ name: "graph", checkpointer, }, async (inputQuery: string) => { const result1 = await step1(inputQuery); const result2 = await humanFeedback(result1); const result3 = await step3(result2); return result3; });
```

All we have done to enable human-in-the-loop workflows is call interrupt() inside a task.

Tip

The results of prior tasks - in this case step1 -- are persisted, so that they are not run again following theinterrupt`.

Let's send in a query string:

```
const config = { configurable: { thread_id: "1" } }; const stream = await graph.stream("foo", config); for await (const event of stream) { console.log(event); }
```

```
{ step1: 'foo bar' } { __interrupt__: [ { value: 'Please provide feedback: foo bar', when: 'during', resumable: true, ns: [Array] } ] }
```

Note that we've paused with an interrupt after step1. The interrupt provides instructions to resume the run. To resume, we issue a Command containing the data expected by the humanFeedback task.

```
import { Command } from "@langchain/langgraph"; const resumeStream = await graph.stream(new Command({ resume: "baz" }), config); // Continue execution for await (const event of resumeStream) { if (event.__metadata__?.cached) { continue; } console.log(event); }
```

```
{ humanFeedback: 'foo bar baz' } { step3: 'foo bar baz qux' } { graph: 'foo bar baz qux' }
```

After resuming, the run proceeds through the remaining step and terminates as expected.

## Agent¶

We will build off of the agent created in the How to create a ReAct agent using the Functional API guide.

Here we will extend the agent by allowing it to reach out to a human for assistance when needed.

### Define model and tools¶

Let's first define the tools and model we will use for our example. As in the ReAct agent guide, we will use a single place-holder tool that gets a description of the weather for a location.

We will use an OpenAI chat model for this example, but any model supporting tool-calling will suffice.

```
import { ChatOpenAI } from "@langchain/openai"; import { tool } from "@langchain/core/tools"; import { z } from "zod"; const model = new ChatOpenAI({ model: "gpt-4o-mini", }); const getWeather = tool(async ({ location }) => { // This is a placeholder for the actual implementation const lowercaseLocation = location.toLowerCase(); if (lowercaseLocation.includes("sf") || lowercaseLocation.includes("san francisco")) { return "It's sunny!"; } else if (lowercaseLocation.includes("boston")) { return "It's rainy!"; } else { return `I am not sure what the weather is in ${location}`; } }, { name: "getWeather", 

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>