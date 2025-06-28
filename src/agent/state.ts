import { BaseMessage } from '@langchain/core/messages';

/**
 * The prebuilt ReAct agent works with a simple list of messages.
 * We can represent this as a "MessagesState" object, which is the
 * expected input format for the agent.
 */
import { ResearchState } from "./research_state.js";

import { RewooState } from "./rewoo_state.js";

import { PlanExecuteState } from "./plan_execute_state.js";

import { SelfRagState } from "./self_rag_state.js";

import { CragState } from "./crag_state.js";

import { CollaborationState } from "./collaboration_state.js";

import { ReflectionState } from "./reflection_state.js";

export type AgentType = "react" | "rag" | "conversational" | "research" | "rewoo" | "plan_execute" | "self_rag" | "crag" | "collaboration" | "research_team" | "document_writing_team" | "reflection" | "FINISH";

export type MessagesState = { messages: BaseMessage[]; next?: AgentType; scratchpad?: string; } | ResearchState | RewooState | PlanExecuteState | SelfRagState | CragState | CollaborationState | MessagesState | ReflectionState;
