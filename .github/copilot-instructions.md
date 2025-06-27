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
*   Use JSDoc-style comments for generating API documentation.
*   Keep documentation up-to-date with code changes.

## CODING STANDARDS

*   Use modern TypeScript features and syntax.
*   Follow the principles of the 12-factor app.
*   Write unit and integration tests for all critical functionality.
*   Enforce code quality with ESLint and Prettier.
*   Use environment variables for configuration.
*   Prefer ESM modules.
*   Use strict compiler and linter settings.

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