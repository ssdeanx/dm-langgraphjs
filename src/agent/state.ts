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

// Define a comprehensive MessagesState that includes all possible properties from other states
export type MessagesState = {
  messages: BaseMessage[];
  next?: AgentType;
  scratchpad?: string;
  
  // Properties from ResearchState
  query?: ResearchState["query"];
  research_data?: ResearchState["research_data"];
  summary?: ResearchState["summary"];
  report?: ResearchState["report"];

  // Properties from RewooState
  task?: RewooState["task"];
  planString?: RewooState["planString"];
  steps?: RewooState["steps"];
  results?: RewooState["results"];
  result?: RewooState["result"];

  // Properties from PlanExecuteState
  input?: PlanExecuteState["input"];
  plan?: PlanExecuteState["plan"];
  pastSteps?: PlanExecuteState["pastSteps"];
  response?: PlanExecuteState["response"];

  // Properties from SelfRagState
  question?: SelfRagState["question"];
  documents?: SelfRagState["documents"];
  generation?: SelfRagState["generation"];
  generationVQuestionGrade?: SelfRagState["generationVQuestionGrade"];
  generationVDocumentsGrade?: SelfRagState["generationVDocumentsGrade"];

  // Properties from CragState
  web_search_results?: CragState["web_search_results"];
  documents_grade?: CragState["documents_grade"];

  // Properties from CollaborationState
  sender?: CollaborationState["sender"];

  // Properties from ReflectionState
  request?: ReflectionState["request"];
  content?: ReflectionState["content"];
  critique?: ReflectionState["critique"];
};
