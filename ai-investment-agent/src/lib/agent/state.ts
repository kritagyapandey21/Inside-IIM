import { Annotation } from "@langchain/langgraph";

/**
 * ResearchState defines the shared state for the LangGraph agent.
 * Each node reads from and writes to this state as data flows through the graph.
 */
export const ResearchState = Annotation.Root({
  // --- Input ---
  companyName: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),

  // --- Data Gathering ---
  companyInfo: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  financialData: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  // Structured numeric metrics from Yahoo Finance (for charts). Null when
  // unavailable (e.g. private company or fetch error).
  financialMetrics: Annotation<Record<string, unknown> | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  newsData: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),

  // --- Analysis & Output ---
  analysis: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  recommendation: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),

  // --- Metadata ---
  currentStep: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "idle",
  }),
  error: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
});

export type ResearchStateType = typeof ResearchState.State;
