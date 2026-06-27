import { StateGraph } from "@langchain/langgraph";
import { ResearchState } from "./state";
import {
  gatherInfoNode,
  gatherFinancialsNode,
  gatherNewsNode,
  analyzeNode,
  recommendNode,
} from "./nodes";

/**
 * Builds and compiles the LangGraph state graph for the Investment Research Agent.
 *
 * Graph Topology (DAG):
 *
 *   START
 *     │
 *     ├──────────────────┬──────────────────┐
 *     ▼                  ▼                  ▼
 *  gatherInfo      gatherFinancials    gatherNews     (parallel)
 *     │                  │                  │
 *     └──────────────────┴──────────────────┘
 *                        │
 *                        ▼
 *                     analyze                          (sequential)
 *                        │
 *                        ▼
 *                    recommend                         (sequential)
 *                        │
 *                        ▼
 *                       END
 *
 * The three data-gathering nodes execute in parallel for efficiency.
 * The analysis and recommendation nodes run sequentially, building on all gathered data.
 */
export function buildResearchGraph() {
  const graph = new StateGraph(ResearchState)
    // Register all nodes
    .addNode("gatherInfo", gatherInfoNode)
    .addNode("gatherFinancials", gatherFinancialsNode)
    .addNode("gatherNews", gatherNewsNode)
    .addNode("analyze", analyzeNode)
    .addNode("recommend", recommendNode)

    // Fan-out: START -> all three gather nodes (parallel execution)
    .addEdge("__start__", "gatherInfo")
    .addEdge("__start__", "gatherFinancials")
    .addEdge("__start__", "gatherNews")

    // Fan-in: all gather nodes -> analyze
    .addEdge("gatherInfo", "analyze")
    .addEdge("gatherFinancials", "analyze")
    .addEdge("gatherNews", "analyze")

    // Sequential: analyze -> recommend -> END
    .addEdge("analyze", "recommend")
    .addEdge("recommend", "__end__");

  return graph.compile();
}
