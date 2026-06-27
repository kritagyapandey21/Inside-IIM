import { NextRequest, NextResponse } from "next/server";
import { buildResearchGraph } from "@/lib/agent/graph";

// The multi-step agent (llama-3.1-70b on NVIDIA NIM) can take several minutes
// end-to-end. Allow the maximum so the request isn't cut off mid-analysis.
export const maxDuration = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-memory result cache + in-flight dedupe.
 *
 * A full analysis is expensive (~8 LLM calls, minutes of wall time) and the UI
 * may legitimately request the same company more than once (deep links, history
 * re-opens, accidental double submits). Caching completed results for a short
 * TTL — and sharing a single in-flight promise per company — keeps the agent
 * from re-spending the rate-limited LLM budget on identical work.
 */
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
type CacheEntry = { at: number; data: any };
const resultCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<any>>();

function cacheKey(name: string) {
  return name.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName } = body;

    if (!companyName || typeof companyName !== "string") {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.NVIDIA_API_KEY) {
      return NextResponse.json(
        { error: "NVIDIA API key is not configured. Please set NVIDIA_API_KEY in your .env.local file." },
        { status: 500 }
      );
    }
    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json(
        { error: "Tavily API key is not configured. Please set TAVILY_API_KEY in your .env.local file." },
        { status: 500 }
      );
    }

    const key = cacheKey(companyName);

    // 1) Serve a fresh cached result instantly.
    const cached = resultCache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      console.log(`[API] Cache hit for: ${companyName}`);
      return NextResponse.json({ success: true, cached: true, data: cached.data });
    }

    // 2) Share a single in-flight run so concurrent identical requests don't
    //    each fire a full (rate-limited) analysis.
    let run = inFlight.get(key);
    if (!run) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`[API] Starting research for: ${companyName}`);
      console.log(`${"=".repeat(60)}\n`);
      run = runAnalysis(companyName.trim())
        .then((data) => {
          resultCache.set(key, { at: Date.now(), data });
          return data;
        })
        .finally(() => inFlight.delete(key));
      inFlight.set(key, run);
    } else {
      console.log(`[API] Joining in-flight analysis for: ${companyName}`);
    }

    const data = await run;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API] Research failed:", error);
    return NextResponse.json(
      {
        error: `Research failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

/** Runs the full agent graph and shapes the response payload. */
async function runAnalysis(companyName: string) {
  const graph = buildResearchGraph();
  const result = await graph.invoke({ companyName });

  // Parse the recommendation JSON the agent produced.
  let recommendation;
  try {
    recommendation = JSON.parse(result.recommendation);
  } catch {
    recommendation = {
      decision: "PASS",
      confidence: "LOW",
      summary: result.recommendation,
      bullCase: [],
      bearCase: [],
      keyMetrics: {},
      riskLevel: "HIGH",
      catalysts: [],
    };
  }

  return {
    companyName,
    recommendation,
    analysis: result.analysis,
    companyInfo: result.companyInfo,
    financialData: result.financialData,
    financialMetrics: result.financialMetrics,
    newsData: result.newsData,
  };
}
