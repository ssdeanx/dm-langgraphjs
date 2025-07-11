# New LangGraph.js Project

[![CI](https://github.com/langchain-ai/new-langgraphjs-project/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/langchain-ai/new-langgraphjs-project/actions/workflows/unit-tests.yml)
[![Integration Tests](https://github.com/langchain-ai/new-langgraphjs-project/actions/workflows/integration-tests.yml/badge.svg)](https://github.com/langchain-ai/new-langgraphjs-project/actions/workflows/integration-tests.yml)

This template demonstrates a simple chatbot implemented using [LangGraph.js](https://github.com/langchain-ai/langgraphjs), showing how to get started with [LangGraph Server](https://langchain-ai.github.io/langgraph/concepts/langgraph_server/#langgraph-server) and using [LangGraph Studio](https://langchain-ai.github.io/langgraph/concepts/langgraph_studio/), a visual debugging IDE.

<p align="center">
  <img src="./static/studio.png" alt="Graph view in LangGraph studio UI" width="75%">
</p>

The core logic, defined in `src/agent/graph.ts`, showcases a straightforward chatbot that responds to user queries while maintaining context from previous messages.

## What it does

The simple chatbot:

1. Takes a user **message** as input
2. Maintains a history of the conversation
3. Returns a placeholder response, updating the conversation history

This template provides a foundation that can be easily customized and extended to create more complex conversational agents.

## Getting Started

1. Install the [LangGraph CLI](https://langchain-ai.github.io/langgraph/concepts/langgraph_cli/).

```bash
npx @langchain/langgraph-cli
```

2. Create a `.env` file. While this starter app does not require any secrets, if you later decide to connect to LLM providers and other integrations, you will likely need to provide API keys.

```bash
cp .env.example .env
```

3. If desired, add your LangSmith API key in your `.env` file.

```
LANGSMITH_API_KEY=lsv2...
```

<!--
Setup instruction auto-generated by `langgraph template lock`. DO NOT EDIT MANUALLY.
-->

<!--
End setup instructions
-->

4. Install dependencies

```
yarn install
```

5. Customize the code as needed.
6. Start the LangGraph Server.

```bash
npx @langchain/langgraph-cli dev
```

For more information on getting started with LangGraph Server, [see here](https://langchain-ai.github.io/langgraph/tutorials/langgraph-platform/local-server/).

## How to customize

1. **Add an LLM call**: You can select and install a chat model wrapper from [the LangChain.js ecosystem](https://js.langchain.com/docs/integrations/chat/), or use LangGraph.js without LangChain.js.
2. **Extend the graph**: The core logic of the chatbot is defined in [graph.ts](./src/agent/graph.ts). You can modify this file to add new nodes, edges, or change the flow of the conversation.

You can also extend this template by:

- Adding [custom tools or functions](https://js.langchain.com/docs/how_to/tool_calling) to enhance the chatbot's capabilities.
- Implementing additional logic for handling specific types of user queries or tasks.
- Add retrieval-augmented generation (RAG) capabilities by integrating [external APIs or databases](https://langchain-ai.github.io/langgraphjs/tutorials/rag/langgraph_agentic_rag/) to provide more customized responses.

## Development

While iterating on your graph, you can edit past state and rerun your app from previous states to debug specific nodes. Local changes will be automatically applied via hot reload. Try experimenting with:

- Modifying the system prompt to give your chatbot a unique personality.
- Adding new nodes to the graph for more complex conversation flows.
- Implementing conditional logic to handle different types of user inputs.

Follow-up requests will be appended to the same thread. You can create an entirely new thread, clearing previous history, using the `+` button in the top right.

For more advanced features and examples, refer to the [LangGraph.js documentation](https://langchain-ai.github.io/langgraphjs/). These resources can help you adapt this template for your specific use case and build more sophisticated conversational agents.

LangGraph Studio also integrates with [LangSmith](https://smith.langchain.com/) for more in-depth tracing and collaboration with teammates, allowing you to analyze and optimize your chatbot's performance.

<!--
Configuration auto-generated by `langgraph template lock`. DO NOT EDIT MANUALLY.
{
  "config_schemas": {
    "agent": {
      "type": "object",
      "properties": {}
    }
  }
}
-->

```mermaid
graph TD

    subgraph 1888["External Systems"]
        1897["User<br>External Actor"]
        1898["AI APIs<br>Google Gemini, etc."]
        1899["Search APIs<br>Tavily, etc."]
        1900["Code Hosting APIs<br>GitHub, etc."]
        1901["Monitoring &amp; Tracing<br>LangSmith, etc."]
    end
    subgraph 1889["LangGraph.js Agent Framework"]
        1890["Main Runner<br>Node.js"]
        1891["Interactive Client<br>Node.js"]
        1892["Agent Supervisor &amp; Graph<br>TypeScript"]
        1893["Agentic Workflows<br>TypeScript"]
        1894["Tool Library<br>TypeScript"]
        1895["Simulation &amp; Evaluation<br>TypeScript"]
        1896["In-Memory State Store<br>TypeScript"]
        %% Edges at this level (grouped by source)
        1890["Main Runner<br>Node.js"] -->|invokes graph| 1892["Agent Supervisor &amp; Graph<br>TypeScript"]
        1891["Interactive Client<br>Node.js"] -->|invokes graph| 1892["Agent Supervisor &amp; Graph<br>TypeScript"]
        1895["Simulation &amp; Evaluation<br>TypeScript"] -->|evaluates| 1892["Agent Supervisor &amp; Graph<br>TypeScript"]
        1892["Agent Supervisor &amp; Graph<br>TypeScript"] -->|selects & runs| 1893["Agentic Workflows<br>TypeScript"]
        1892["Agent Supervisor &amp; Graph<br>TypeScript"] -->|manages state in| 1896["In-Memory State Store<br>TypeScript"]
        1893["Agentic Workflows<br>TypeScript"] -->|uses| 1894["Tool Library<br>TypeScript"]
        1894["Tool Library<br>TypeScript"] -->|reads/writes| 1896["In-Memory State Store<br>TypeScript"]
    end
    %% Edges at this level (grouped by source)
    1897["User<br>External Actor"] -->|runs| 1890["Main Runner<br>Node.js"]
    1897["User<br>External Actor"] -->|interacts with| 1891["Interactive Client<br>Node.js"]
    1895["Simulation &amp; Evaluation<br>TypeScript"] -->|simulates user with| 1898["AI APIs<br>Google Gemini, etc."]
    1892["Agent Supervisor &amp; Graph<br>TypeScript"] -->|sends traces to| 1901["Monitoring &amp; Tracing<br>LangSmith, etc."]
    1893["Agentic Workflows<br>TypeScript"] -->|calls| 1898["AI APIs<br>Google Gemini, etc."]
    1894["Tool Library<br>TypeScript"] -->|queries| 1899["Search APIs<br>Tavily, etc."]
    1894["Tool Library<br>TypeScript"] -->|interacts with| 1900["Code Hosting APIs<br>GitHub, etc."]
```
