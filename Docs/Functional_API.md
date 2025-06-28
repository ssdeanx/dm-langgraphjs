Functional API

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# Functional API¶

Note

The Functional API requires @langchain/langgraph>=0.2.42.

## Overview¶

The Functional API allows you to add LangGraph's key features -- persistence, memory, human-in-the-loop, and streaming — to your applications with minimal changes to your existing code.

It is designed to integrate these features into existing code that may use standard language primitives for branching and control flow, such as if statements, for loops, and function calls. Unlike many data orchestration frameworks that require restructuring code into an explicit pipeline or DAG, the Functional API allows you to incorporate these capabilities without enforcing a rigid execution model.

The Functional API uses two key building blocks:

* entrypoint – An entrypoint is a wrapper that takes a function as the starting point of a workflow. It encapsulates workflow logic and manages execution flow, including handling long-running tasks and interrupts.
* task – Represents a discrete unit of work, such as an API call or data processing step, that can be executed asynchronously within an entrypoint. Tasks return a future-like object that can be awaited or resolved synchronously.

This provides a minimal abstraction for building workflows with state management and streaming.

Tip

For users who prefer a more declarative approach, LangGraph's Graph API allows you to define workflows using a Graph paradigm. Both APIs share the same underlying runtime, so you can use them together in the same application. Please see the Functional API vs. Graph API section for a comparison of the two paradigms.

## Example¶

Below we demonstrate a simple application that writes an essay and interrupts to request human review.

```
import { task, entrypoint, interrupt, MemorySaver } from "@langchain/langgraph"; const writeEssay = task("write_essay", (topic: string): string => { // A placeholder for a long-running task. return `An essay about topic: ${topic}`; }); const workflow = entrypoint( { checkpointer: new MemorySaver(), name: "workflow" }, async (topic: string) => { const essay = await writeEssay(topic); const isApproved = interrupt({ // Any json-serializable payload provided to interrupt as argument. // It will be surfaced on the client side as an Interrupt when streaming data // from the workflow. essay, // The essay we want reviewed. // We can add any additional information that we need. // For example, introduce a key called "action" with some instructions. action: "Please approve/reject the essay", }); return { essay, // The essay that was generated isApproved, // Response from HIL }; } );
```

## Entrypoint¶

The entrypoint function can be used to create a workflow from a function. It encapsulates workflow logic and manages execution flow, including handling long-running tasks and interrupts.

### Definition¶

An entrypoint is defined by passing a function to the entrypoint function.

The function must accept a single positional argument, which serves as the workflow input. If you need to pass multiple pieces of data, use an object as the input type for the first argument.

You will often want to pass a checkpointer to the entrypoint function to enable persistence and use features like human-in-the-loop.

```
import { entrypoint, MemorySaver } from "@langchain/langgraph"; const checkpointer = new MemorySaver(); const myWorkflow = entrypoint( { checkpointer, name: "myWorkflow" }, async (someInput: Record<string, any>): Promise<number> => { // some logic that may involve long-running tasks like API calls, // and may be interrupted for human-in-the-loop. return result; } );
```

Serialization

The inputs and outputs of entrypoints must be JSON-serializable to support checkpointing. Please see the serialization section for more details.

### Injectable Parameters¶

When declaring an entrypoint, you can access additional parameters that will be injected automatically at run time by using the getPreviousState function and other utilities. These parameters include:

| Parameter | Description |
| --- | --- |
| config | For accessing runtime configuration. Automatically populated as the second argument to the entrypoint function (but not task, since tasks can have a variable number of arguments). See RunnableConfig for information. |
| config.store | An instance of BaseStore. Useful for long-term memory. |
| config.writer | A writer used for streaming back custom data. See the guide on streaming custom data |
| getPreviousState() | Access the state associated with the previous checkpoint for the given thread using getPreviousState. See state management. |

### Executing¶

Using the entrypoint function will return an object that can be executed using the invoke and stream methods.

```
const config = { configurable: { thread_id: "some_thread_id", }, }; await myWorkflow.invoke(someInput, config); // Wait for the result
`

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>