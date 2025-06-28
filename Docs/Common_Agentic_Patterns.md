Agent architectures

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# Agent architectures¶

Many LLM applications implement a particular control flow of steps before and / or after LLM calls. As an example, RAG performs retrieval of relevant documents to a question, and passes those documents to an LLM in order to ground the model's response.

Instead of hard-coding a fixed control flow, we sometimes want LLM systems that can pick its own control flow to solve more complex problems! This is one definition of an agent: an agent is a system that uses an LLM to decide the control flow of an application. There are many ways that an LLM can control application:

* An LLM can route between two potential paths
* An LLM can decide which of many tools to call
* An LLM can decide whether the generated answer is sufficient or more work is needed

As a result, there are many different types of agent architectures, which given an LLM varying levels of control.

## Router¶

A router allows an LLM to select a single step from a specified set of options. This is an agent architecture that exhibits a relatively limited level of control because the LLM usually governs a single decision and can return a narrow set of outputs. Routers typically employ a few different concepts to achieve this.

### Structured Output¶

Structured outputs with LLMs work by providing a specific format or schema that the LLM should follow in its response. This is similar to tool calling, but more general. While tool calling typically involves selecting and using predefined functions, structured outputs can be used for any type of formatted response. Common methods to achieve structured outputs include:

1. Prompt engineering: Instructing the LLM to respond in a specific format.
2. Output parsers: Using post-processing to extract structured data from LLM responses.
3. Tool calling: Leveraging built-in tool calling capabilities of some LLMs to generate structured outputs.

Structured outputs are crucial for routing as they ensure the LLM's decision can be reliably interpreted and acted upon by the system. Learn more about structured outputs in this how-to guide.

## Tool calling agent¶

While a router allows an LLM to make a single decision, more complex agent architectures expand the LLM's control in two key ways:

1. Multi-step decision making: The LLM can control a sequence of decisions rather than just one.
2. Tool access: The LLM can choose from and use a variety of tools to accomplish tasks.

ReAct is a popular general purpose agent architecture that combines these expansions, integrating three core concepts.

1. Tool calling: Allowing the LLM to select and use various tools as needed.
2. Memory: Enabling the agent to retain and use information from previous steps.
3. Planning: Empowering the LLM to create and follow multi-step plans to achieve goals.

This architecture allows for more complex and flexible agent behaviors, going beyond simple routing to enable dynamic problem-solving across multiple steps. You can use it with createReactAgent.

### Tool calling¶

Tools are useful whenever you want an agent to interact with external systems. External systems (e.g., APIs) often require a particular input schema or payload, rather than natural language. When we bind an API, for example, as a tool we given the model awareness of the required input schema. The model will choose to call a tool based upon the natural language input from the user and it will return an output that adheres to the tool's schema.

Many LLM providers support tool calling and tool calling interface in LangChain is simple: you can define a tool schema, and pass it into ChatModel.bindTools([tool]).

### Memory¶

Memory is crucial for agents, enabling them to retain and utilize information across multiple steps of problem-solving. It operates on different scales:

1. Short-term memory: Allows the agent to access information acquired during earlier steps in a sequence.
2. Long-term memory: Enables the agent to recall information from previous interactions, such as past messages in a conversation.

LangGraph provides full control over memory implementation:

* State: User-defined schema specifying the exact structure of memory to retain.
* Checkpointers: Mechanism to store state at every step across different interactions.

This flexible approach allows you to tailor the memory system to your specific agent architecture needs. For a practical guide on adding memory to your graph, see this tutorial.

Effective memory management enhances an agent's ability to maintain context, learn from past experiences, and make more informed decisions over time.

### Planning¶

In the ReAct architecture, an LLM is called repeatedly in a while-loop. At each step the agent decides which tools to call, and what the inputs to those tools should be. Those tools are then executed, and the outputs are fed back into the LLM as observations. The

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>