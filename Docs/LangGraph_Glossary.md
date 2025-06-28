LangGraph Glossary

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# LangGraph Glossary¶

## Graphs¶

At its core, LangGraph models agent workflows as graphs. You define the behavior of your agents using three key components:

1. State: A shared data structure that represents the current snapshot of your application. It is represented by an Annotation object.
2. Nodes: JavaScript/TypeScript functions that encode the logic of your agents. They receive the current State as input, perform some computation or side-effect, and return an updated State.
3. Edges: JavaScript/TypeScript functions that determine which Node to execute next based on the current State. They can be conditional branches or fixed transitions.

By composing Nodes and Edges, you can create complex, looping workflows that evolve the State over time. The real power, though, comes from how LangGraph manages that State. To emphasize: Nodes and Edges are nothing more than JavaScript/TypeScript functions - they can contain an LLM or just good ol' JavaScript/TypeScript code.

In short: nodes do the work. edges tell what to do next.

LangGraph's underlying graph algorithm uses message passing to define a general program. When a Node completes its operation, it sends messages along one or more edges to other node(s). These recipient nodes then execute their functions, pass the resulting messages to the next set of nodes, and the process continues. Inspired by Google's Pregel system, the program proceeds in discrete "super-steps."

A super-step can be considered a single iteration over the graph nodes. Nodes that run in parallel are part of the same super-step, while nodes that run sequentially belong to separate super-steps. At the start of graph execution, all nodes begin in an inactive state. A node becomes active when it receives a new message (state) on any of its incoming edges (or "channels"). The active node then runs its function and responds with updates. At the end of each super-step, nodes with no incoming messages vote to halt by marking themselves as inactive. The graph execution terminates when all nodes are inactive and no messages are in transit.

### StateGraph¶

The StateGraph class is the main graph class to use. This is parameterized by a user defined State object. (defined using the Annotation object and passed as the first argument)

### MessageGraph (legacy)¶

The MessageGraph class is a special type of graph. The State of a MessageGraph is ONLY an array of messages. This class is rarely used except for chatbots, as most applications require the State to be more complex than an array of messages.

### Compiling your graph¶

To build your graph, you first define the state, you then add nodes and edges, and then you compile it. What exactly is compiling your graph and why is it needed?

Compiling is a pretty simple step. It provides a few basic checks on the structure of your graph (no orphaned nodes, etc). It is also where you can specify runtime args like checkpointers and breakpoints. You compile your graph by just calling the .compile method:

```
const graph = graphBuilder.compile(...);
```

You MUST compile your graph before you can use it.

## State¶

The first thing you do when you define a graph is define the State of the graph. The State includes information on the structure of the graph, as well as reducer functions which specify how to apply updates to the state. The schema of the State will be the input schema to all Nodes and Edges in the graph, and should be defined using an Annotation object. All Nodes will emit updates to the State which are then applied using the specified reducer function.

### Annotation¶

The way to specify the schema of a graph is by defining a root Annotation object, where each key is an item in the state.

#### Multiple schemas¶

Typically, all graph nodes communicate with a single state annotation. This means that they will read and write to the same state channels. But, there are cases where we want more control over this:

* Internal nodes can pass information that is not required in the graph's input / output.
* We may also want to use different input / output schemas for the graph. The output might, for example, only contain a single relevant output key.

It is possible to have nodes write to private state channels inside the graph for internal node communication. We can simply define a private annotation, PrivateState. See this notebook for more detail.

It is also possible to define explicit input and output schemas for a graph. In these cases, we define an "internal" schema that contains all keys relevant to graph operations. But, we also define input and output schemas that are sub-sets of the "internal" schema to constrain the input and output of the graph. See this guide for more detail.

Let's look at an example:

```
import { Annotation, START, StateGraph, StateType, UpdateType, } from "@langchain/langgraph"; const In

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>