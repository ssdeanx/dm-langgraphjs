How to add and use subgraphs

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add and use subgraphs¶

Prerequisites

This guide assumes familiarity with the following:

* Subgraphs
* State

Subgraphs allow you to build complex systems with multiple components that are themselves graphs. A common use case for using subgraphs is building multi-agent systems.

The main question when adding subgraphs is how the parent graph and subgraph communicate, i.e. how they pass the state between each other during the graph execution. There are two scenarios:

* parent graph and subgraph share schema keys. In this case, you can add a node with the compiled subgraph
* parent graph and subgraph have different schemas. In this case, you have to add a node function that invokes the subgraph: this is useful when the parent graph and the subgraph have different state schemas and you need to transform state before or after calling the subgraph

Below we show to to add subgraphs for each scenario.

## Setup¶

First, let's install the required packages

```
npm install @langchain/langgraph @langchain/core
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here.

## Add a node with the compiled subgraph¶

A common case is for the parent graph and subgraph to communicate over a shared state key (channel). For example, in multi-agent systems, the agents often communicate over a shared messages key.

If your subgraph shares state keys with the parent graph, you can follow these steps to add it to your graph:

1. Define the subgraph workflow (subgraphBuilder in the example below) and compile it
2. Pass compiled subgraph to the .addNode method when defining the parent graph workflow

Let's take a look at an example.

```
import { StateGraph, Annotation } from "@langchain/langgraph"; const SubgraphStateAnnotation = Annotation.Root({ foo: Annotation<string>, // note that this key is shared with the parent graph state bar: Annotation<string>, }); const subgraphNode1 = async (state: typeof SubgraphStateAnnotation.State) => { return { bar: "bar" }; }; const subgraphNode2 = async (state: typeof SubgraphStateAnnotation.State) => { // note that this node is using a state key ('bar') that is only available in the subgraph // and is sending update on the shared state key ('foo') return { foo: state.foo + state.bar }; }; const subgraphBuilder = new StateGraph(SubgraphStateAnnotation) .addNode("subgraphNode1", subgraphNode1) .addNode("subgraphNode2", subgraphNode2) .addEdge("__start__", "subgraphNode1") .addEdge("subgraphNode1", "subgraphNode2") const subgraph = subgraphBuilder.compile(); // Define parent graph const ParentStateAnnotation = Annotation.Root({ foo: Annotation<string>, }); const node1 = async (state: typeof ParentStateAnnotation.State) => { return { foo: "hi! " + state.foo, }; } const builder = new StateGraph(ParentStateAnnotation) .addNode("node1", node1) // note that we're adding the compiled subgraph as a node to the parent graph .addNode("node2", subgraph) .addEdge("__start__", "node1") .addEdge("node1", "node2") const graph = builder.compile();
```

```
const stream = await graph.stream({ foo: "foo" }); for await (const chunk of stream) { console.log(chunk); }
```

```
{ node1: { foo: 'hi! foo' } } { node2: { foo: 'hi! foobar' } }
```

You can see that the final output from the parent graph includes the results of subgraph invocation (the string "bar").

If you would like to see streaming output from the subgraph, you can specify subgraphs: True when streaming. See more on streaming from subgraphs in this how-to guide.

```
const streamWithSubgraphs = await graph.stream({ foo: "foo" }, { subgraphs: true }); for await (const chunk of streamWithSubgraphs) { console.log(chunk); }
```

```
[ [], { node1: { foo: 'hi! foo' } } ] [ [ 'node2:22f27b01-fa9f-5f46-9b5b-166a80d96791' ], { subgraphNode1: { bar: 'bar' } } ] [ [ 'node2:22f27b01-fa9f-5f46-9b5b-166a80d96791' ], { subgraphNode2: { foo: 'hi! foobar' } } ] [ [], { node2: { foo: 'hi! foobar' } } ]
```

You'll notice that the chunk output format has changed to include some additional information about the subgraph it came from.

## Add a node function that invokes the subgraph¶

For more complex systems you might want to define subgraphs that have a completely different schema from the parent graph (no shared keys). For example, in a multi-agent RAG system, a search agent might only need to keep track of queries and retrieved documents.

If that's the case for your application, you need to define a node function that invokes the subgraph. This function needs to transform the input (parent) state to the subgraph state before invoking the subgraph, and transform the results back to the parent

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>