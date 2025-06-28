---
description: AI rules derived by SpecStory from the project AI interaction history
globs: *
---

## Project Rules

### General Guidelines

*   Adhere to the project's architectural patterns and principles.
*   Write clean, well-documented, and testable code.
*   Follow established naming conventions.
*   Ensure code is modular and reusable.
*   Handle errors gracefully.
*   Optimize for performance and scalability.

## TECH STACK

*   TypeScript
*   LangGraph.js
*   LangChain
*   Jest (testing)
*   ESLint (linting)
*   Prettier (formatting)
*   dotenv (environment variables)
*   @langchain/community
*   @langchain/core
*   @langchain/google-genai
*   ts-jest

## PROJECT DOCUMENTATION & CONTEXT SYSTEM

*   Maintain a comprehensive README.md file with setup, usage, and customization instructions.
*   Document all modules, classes, and functions with clear and concise comments.
*   Use T SDoc-style comments for generating API documentation.
*   Keep documentation up-to-date with code changes.

## CODING STANDARDS

*   Use modern TypeScript features and syntax.
*   Follow the principles of the 12-factor app.
*   Write unit and integration tests for all critical functionality.
*   Enforce code quality with ESLint and Prettier.
*   Use environment variables for configuration.
*   Prefer ESM modules.
*   Use strict compiler and linter settings.
*   When using namespace imports for libraries like `pdf-parse`, access the default export using the `.default` property (e.g., `pdfParse.default(dataBuffer)`).
*   When using `simple-git`, invoke it as a function with the base directory string: `simpleGit(baseDir)`. Avoid using the `fs` option in the `simpleGit` constructor, as it's not supported. If in-memory Git operations are required, consider using `isomorphic-git` with `memfs`.
*   When using LangChain `tool`, ensure the function always returns a `string` or `Promise<string>`. Convert any other data types to a string before returning.
*   When using the `HumanMessage` constructor, ensure you always pass a string as the content. If the content is not a string, convert it to a string (e.g., with `String()` or `JSON.stringify()` as appropriate).
*   When invoking a LangChain model with an array of messages, pass the `state.messages` array directly as the argument. Do not wrap it in an object with a `messages` property.
*   When using `addEdge` or `addConditionalEdges` in LangGraph, use valid node names. If encountering TypeScript type errors with these functions, and after ensuring correct usage per LangGraph version (v0.0.36+), consider casting the object or node names to `any` to bypass restrictive type definitions. Example: `workflow.addEdge("nodeName" as any, "anotherNodeName");` or `evaluationWorkflowBuilder.addConditionalEdges("chatbot" as any, shouldContinue, { user: "user", [END]: END, } as any);`
*   When working with `memfs`, use `createFsFromVolume(vol)` to get the `fs` object directly. Do not attempt to access it as a property (`.fs`) of the result.
*   When reading files from `memfs`, use `fs.readFileSync(filePath, "utf-8")` for synchronous reads, wrapped in a Promise to keep the function async. Ensure the result is cast to a string. Handle potential errors gracefully, returning an error message string if reading fails.
*   When using `fs.readdir` within the `memfs` environment, always include the encoding argument (`"utf8"`). Example: `await fs.readdir(path, "utf8")`.
*   When using `addConditionalEdges` in LangGraph, if encountering TypeScript type errors related to state types or argument types, and after ensuring correct usage per LangGraph version (v0.0.36+), use type casting with `as any` to bypass restrictive type definitions. Example: `workflow.addConditionalEdges("supervisor" as any, ((state: MessagesState) => state.next as AgentType) as any, { ... });`
*   When using `addEdge` in LangGraph and encountering TypeScript type errors indicating that an argument is not assignable to parameter of type '"\_\_start\_\_" | "\_\_end\_\_"', ensure that you are using the correct string literals for start and end nodes (i.e. `"__start__"` and `"__end__"`). If the issue persists, and after ensuring correct usage per LangGraph version (v0.0.36+), consider casting the object or node names to `any` to bypass restrictive type definitions. Example: `workflow.addEdge("__start__" as any, "supervisor" as any);`
*   When using the `wrapWorkflow` function in LangGraph, remove unused type parameters `<Input, Output>`. The function signature should be `const wrapWorkflow = (workflow: any) => async (state: MessagesState): Promise<Partial<MessagesState>> => { ... }`
*   When instantiating a `StateGraph` in LangGraph, omit the explicit generic parameters `<MessagesState, NodeNames>` and let TypeScript infer the types from the `GraphState`. Example: `const workflow = new StateGraph(GraphState);`
*   When instantiating a `StateGraph` in LangGraph, ensure the state definition is passed as the *second* argument (`configSchema`), not the first.
*   When using the `TavilySearch` tool, ensure the Tavily API key is loaded from environment variables (e.g., `process.env.TAVILY_API_KEY`). If the API key is not found, return an error message. When instantiating `TavilySearch`, use the constructor without passing the `apiKey` directly. The `maxResults` parameter should be passed as part of the `invoke` call.
*   When using `MemoryVectorStore.fromDocuments`, ensure you provide the `embeddings` argument. Use the imported `embeddings` instance (e.g., `embeddings`) when creating the vector store with `MemoryVectorStore.fromDocuments(splitDocs, embeddings);`.
*   When using `client.runs.stream`, ensure the `callbacks` property is not included in the payload. Only supported properties such as `input` and `streamMode` should be used. Tracing should be set up elsewhere, not via this payload.
*   When working with LangGraph SDK streams, the valid events are `"messages/partial"` (for streaming message chunks).
*   When using `client.ts` streams in `messages` mode, only handle events that are actually emitted by the stream. Specifically, avoid handling `"on_tool_start"` and `"on_tool_end"` events, as they are not valid for this stream mode.
*   When using `traceable` with LangChain models or embeddings, wrap the model or embedding instance directly with `traceable(instance, { name: "ModelName" })` instead of using `.pipe(traceable(instance, ...))`. For example: `const model = traceable(llm, { name: "ChatGoogle" });` and `const embeddings = traceable(embeddingModel, { name: "GoogleEmbeddings" });`
*   When using a LangChain Runnable (such as a model), call it using `.invoke(input)` instead of calling it directly as a function `model(input)`.
*   When using `supervisorPrompt.formatMessages` to format a prompt for a LangChain model, be aware that it returns an array of messages. Ensure the model is invoked with an appropriate input type. If the model expects a string, use `supervisorPrompt.format` instead.
*   When using `addEdge` in LangGraph, use the imported `START` and `END` constants instead of the string literals `"__start__"` and `"__end__"` as the source/destination node.
*   When invoking LangChain models (such as in the supervisor function), use `.invoke(input)` instead of calling the model directly as a function `model(input)`. This is to align with the LangChain Runnable API.
*   When configuring ESLint, use the `compat.extends` method from the `@eslint/eslintrc` package to extend existing configurations. Spread each string individually, as it expects a single string per call. For example: `export default [ ...compat.extends("eslint:recommended"), ...compat.extends("plugin:@typescript-eslint/recommended"), ...compat.extends("prettier"), ... ];`

## WORKFLOW & RELEASE RULES

*   Use Git for version control.
*   Follow a branching strategy (e.g., Gitflow).
*   Use pull requests for code review.
*   Automate testing, linting, and formatting with CI/CD pipelines (e.g., GitHub Actions).
*   Use semantic versioning for releases.
*   Create release notes for each version.
*   When using the `release-please-action` in GitHub Actions, ensure that all inputs are valid and supported by the action. Refer to the action's documentation for a list of valid inputs. Do not use unsupported inputs like `changelog-types`.

## DEBUGGING

*   Use console.log statements for debugging during development.
*   Use a debugger (e.g., VS Code debugger) for more advanced debugging.
*   Write unit tests to catch bugs early.
*   Use logging frameworks for production debugging.

## TESTING

*   Write unit tests for individual components and functions.
*   Write integration tests to verify the interaction between different parts of the system.
*   Use Jest as the testing framework.
*   Aim for high test coverage.
*   Run tests automatically in CI/CD pipelines.
*   Mock external dependencies for unit testing.

## AGENT SPECIFIC RULES
* Agent state should maintain a list of messages.
* Call model nodes should simulate assistant responses.
* Route functions should determine whether to continue or end the conversation based on the state.
* When determining the message type in route functions, use `instanceof AIMessage` to check if the last message is from the assistant instead of checking for `.type === "AIMessageChunk"`. Ensure `AIMessage` is imported from `@langchain/core/messages`.