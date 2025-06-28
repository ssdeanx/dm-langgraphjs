How to add thread-level persistence to subgraphs

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# How to add thread-level persistence to subgraphs¶

Prerequisites

This guide assumes familiarity with the following:

* Subgraphs
* Persistence

This guide shows how you can add thread-level persistence to graphs that use subgraphs.

## Setup¶

First, let's install required packages:

```
$ npm install @langchain/langgraph @langchain/core
```

Set up LangSmith for LangGraph development

Sign up for LangSmith to quickly spot issues and improve the performance of your LangGraph projects. LangSmith lets you use trace data to debug, test, and monitor your LLM apps built with LangGraph — read more about how to get started here.

## Define the graph with persistence¶

To add persistence to a graph with subgraphs, all you need to do is pass a checkpointer when compiling the parent graph. LangGraph will automatically propagate the checkpointer to the child subgraphs.

Note

You shouldn't provide a checkpointer when compiling a subgraph. Instead, you must define a \*\*single\*\* checkpointer that you pass to parentGraph.compile(), and LangGraph will automatically propagate the checkpointer to the child subgraphs. If you pass the checkpointer to the subgraph.compile(), it will simply be ignored. This also applies when you add a node that invokes the subgraph explicitly.

Let's define a simple graph with a single subgraph node to show how to do this.

```
import { StateGraph, Annotation } from "@langchain/langgraph"; // subgraph const SubgraphStateAnnotation = Annotation.Root({ foo: Annotation<string>, bar: Annotation<string>, }); const subgraphNode1 = async (state: typeof SubgraphStateAnnotation.State) => { return { bar: "bar" }; }; const subgraphNode2 = async (state: typeof SubgraphStateAnnotation.State) => { // note that this node is using a state key ('bar') that is only available in the subgraph // and is sending update on the shared state key ('foo') return { foo: state.foo + state.bar }; }; const subgraphBuilder = new StateGraph(SubgraphStateAnnotation) .addNode("subgraphNode1", subgraphNode1) .addNode("subgraphNode2", subgraphNode2) .addEdge("__start__", "subgraphNode1") .addEdge("subgraphNode1", "subgraphNode2") const subgraph = subgraphBuilder.compile(); // Define parent graph const ParentStateAnnotation = Annotation.Root({ foo: Annotation<string>, }); const node1 = async (state: typeof ParentStateAnnotation.State) => { return { foo: "hi! " + state.foo, }; } const builder = new StateGraph(ParentStateAnnotation) .addNode("node1", node1) // note that we're adding the compiled subgraph as a node to the parent graph .addNode("node2", subgraph) .addEdge("__start__", "node1") .addEdge("node1", "node2") const graph = builder.compile();
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