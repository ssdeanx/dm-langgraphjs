Multi-agent Systems

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# Multi-agent Systems¶

An agent is a system that uses an LLM to decide the control flow of an application. As you develop these systems, they might grow more complex over time, making them harder to manage and scale. For example, you might run into the following problems:

* agent has too many tools at its disposal and makes poor decisions about which tool to call next
* context grows too complex for a single agent to keep track of
* there is a need for multiple specialization areas in the system (e.g. planner, researcher, math expert, etc.)

To tackle these, you might consider breaking your application into multiple smaller, independent agents and composing them into a multi-agent system. These independent agents can be as simple as a prompt and an LLM call, or as complex as a ReAct agent (and more!).

The primary benefits of using multi-agent systems are:

* Modularity: Separate agents make it easier to develop, test, and maintain agentic systems.
* Specialization: You can create expert agents focused on specific domains, which helps with the overall system performance.
* Control: You can explicitly control how agents communicate (as opposed to relying on function calling).

## Multi-agent architectures¶

There are several ways to connect agents in a multi-agent system:

* Network: each agent can communicate with every other agent. Any agent can decide which other agent to call next.
* Supervisor: each agent communicates with a single supervisor agent. Supervisor agent makes decisions on which agent should be called next.
* Hierarchical: you can define a multi-agent system with a supervisor of supervisors. This is a generalization of the supervisor architecture and allows for more complex control flows.
* Custom multi-agent workflow: each agent communicates with only a subset of agents. Parts of the flow are deterministic, and only some agents can decide which other agents to call next.

### Handoffs¶

In multi-agent architectures, agents can be represented as graph nodes. Each agent node executes its step(s) and decides whether to finish execution or route to another agent, including potentially routing to itself (e.g., running in a loop). A common pattern in multi-agent interactions is handoffs, where one agent hands off control to another. Handoffs allow you to specify:

* destination: target agent to navigate to (e.g., name of the node to go to)
* payload: information to pass to that agent (e.g., state update)

To implement handoffs in LangGraph, agent nodes can return Command object that allows you to combine both control flow and state updates:

```
const agent = (state: typeof StateAnnotation.State) => { const goto = getNextAgent(...) // 'agent' / 'another_agent' return new Command({ // Specify which agent to call next goto: goto, // Update the graph state update: { foo: "bar", } }); };
```

In a more complex scenario where each agent node is itself a graph (i.e., a subgraph), a node in one of the agent subgraphs might want to navigate to a different agent. For example, if you have two agents, alice and bob (subgraph nodes in a parent graph), and alice needs to navigate to bob, you can set graph=Command.PARENT in the Command object:

```
const some_node_inside_alice = (state) => { return new Command({ goto: "bob", update: { foo: "bar", }, // specify which graph to navigate to (defaults to the current graph) graph: Command.PARENT, }) }
```

### Network¶

In this architecture, agents are defined as graph nodes. Each agent can communicate with every other agent (many-to-many connections) and can decide which agent to call next. This architecture is good for problems that do not have a clear hierarchy of agents or a specific sequence in which agents should be called.

```
import { StateGraph, Annotation, MessagesAnnotation, Command } from "@langchain/langgraph"; import { ChatOpenAI } from "@langchain/openai"; const model = new ChatOpenAI({ model: "gpt-4o", }); const agent1 = async (state: typeof MessagesAnnotation.State) => { // you can pass relevant parts of the state to the LLM (e.g., state.messages) // to determine which agent to call next. a common pattern is to call the model // with a structured output (e.g. force it to return an output with a "next_agent" field) const response = await model.withStructuredOutput(...).invoke(...); return new Command({ update: { messages: [response.content], }, goto: response.next_agent, }); }; const agent2 = async (state: typeof MessagesAnnotation.State) => { const response = await model.withStructuredOutput(...).invoke(...); return new Command({ update: { messages: [response.content], }, goto: response.next_agent, }); }; const agent3 = async (state: typeof MessagesAnnotation.State) => { ... return new Command({ update: { messages: [response.content], }, goto: response.next_agent, }); }; const graph = new StateGraph(MessagesAnnotati

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>