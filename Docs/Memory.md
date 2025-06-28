Memory

Skip to content

Our Building Ambient Agents with LangGraph course is now available on LangChain Academy!

# Memory¶

## What is Memory?¶

Memory in AI applications refers to the ability to process, store, and effectively recall information from past interactions. With memory, your agents can learn from feedback and adapt to users' preferences. This guide is divided into two sections based on the scope of memory recall: short-term memory and long-term memory.

Short-term memory, or thread-scoped memory, can be recalled at any time from within a single conversational thread with a user. LangGraph manages short-term memory as a part of your agent's state. State is persisted to a database using a checkpointer so the thread can be resumed at any time. Short-term memory updates when the graph is invoked or a step is completed, and the State is read at the start of each step.

Long-term memory is shared across conversational threads. It can be recalled at any time and in any thread. Memories are scoped to any custom namespace, not just within a single thread ID. LangGraph provides stores (reference doc) to let you save and recall long-term memories.

Both are important to understand and implement for your application.

## Short-term memory¶

Short-term memory lets your application remember previous interactions within a single thread or conversation. A thread organizes multiple interactions in a session, similar to the way email groups messages in a single conversation.

LangGraph manages short-term memory as part of the agent's state, persisted via thread-scoped checkpoints. This state can normally include the conversation history along with other stateful data, such as uploaded files, retrieved documents, or generated artifacts. By storing these in the graph's state, the bot can access the full context for a given conversation while maintaining separation between different threads.

Since conversation history is the most common form of representing short-term memory, in the next section, we will cover techniques for managing conversation history when the list of messages becomes long. If you want to stick to the high-level concepts, continue on to the long-term memory section.

### Managing long conversation history¶

Long conversations pose a challenge to today's LLMs. The full history may not even fit inside an LLM's context window, resulting in an irrecoverable error. Even if your LLM technically supports the full context length, most LLMs still perform poorly over long contexts. They get "distracted" by stale or off-topic content, all while suffering from slower response times and higher costs.

Managing short-term memory is an exercise of balancing precision & recall with your application's other performance requirements (latency & cost). As always, it's important to think critically about how you represent information for your LLM and to look at your data. We cover a few common techniques for managing message lists below and hope to provide sufficient context for you to pick the best tradeoffs for your application:

* Editing message lists: How to think about trimming and filtering a list of messages before passing to language model.
* Summarizing past conversations: A common technique to use when you don't just want to filter the list of messages.

### Editing message lists¶

Chat models accept context using messages, which include developer provided instructions (a system message) and user inputs (human messages). In chat applications, messages alternate between human inputs and model responses, resulting in a list of messages that grows longer over time. Because context windows are limited and token-rich message lists can be costly, many applications can benefit from using techniques to manually remove or forget stale information.

The most direct approach is to remove old messages from a list (similar to a least-recently used cache).

The typical technique for deleting content from a list in LangGraph is to return an update from a node telling the system to delete some portion of the list. You get to define what this update looks like, but a common approach would be to let you return an object or dictionary specifying which values to retain.

```
import { Annotation } from "@langchain/langgraph"; const StateAnnotation = Annotation.Root({ myList: Annotation<any[]>({ reducer: ( existing: string[], updates: string[] | { type: string; from: number; to?: number } ) => { if (Array.isArray(updates)) { // Normal case, add to the history return [...existing, ...updates]; } else if (typeof updates === "object" && updates.type === "keep") { // You get to decide what this looks like. // For example, you could simplify and just accept a string "DELETE" // and clear the entire list. return existing.slice(updates.from, updates.to); } // etc. We define how to interpret updates return existing; }, default: () => [], }), }); type State = typeof StateAnnotation.State; function myNode(state: State) { return { // 

<error>Content truncated. Call the fetch tool with a start_index of 5000 to get more content.</error>