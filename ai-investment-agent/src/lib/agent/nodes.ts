import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { ResearchStateType } from "./state";
import { createSearchTool, fetchFinancialData } from "./tools";
import { resolveTicker } from "./marketData";

/**
 * Creates the LLM instance configured for the Gemini API.
 */
export function createLLM() {
  return new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY || "",
    temperature: 0.3,
    maxOutputTokens: 4096,
    maxRetries: 0, // we manage retries/backoff ourselves in invokeWithRetry
  });
}

/**
 * Invoke the LLM with exponential backoff + jitter on transient failures.
 *
 * Rate-limited / capacity `429`s can still happen when many calls fire in
 * quick succession (this agent makes ~8 LLM calls per analysis, three of them
 * concurrently). Without retries a single 429 collapses a node into an
 * "Unable to…" string, which is what left the verdict / catalysts / sentiment
 * widgets stuck on "Generating verdict…" forever. Retrying with backoff turns
 * those transient failures into a slightly slower — but correct — result.
 */
async function invokeWithRetry(
  messages: BaseMessage[],
  { retries = 5, baseDelayMs = 1500, label = "llm" } = {}
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // A fresh client per attempt avoids any stuck connection state.
      const llm = createLLM();
      // Hard per-request ceiling so a slow/hung connection can never block a
      // node indefinitely — it surfaces as a timeout we then retry.
      const res = await llm.invoke(messages, { timeout: 90_000 });
      return typeof res.content === "string"
        ? res.content
        : JSON.stringify(res.content);
    } catch (err) {
      lastErr = err;
      const status = extractStatus(err);
      const retriable = status === 429 || status === 500 || status === 503 || status === 504;
      if (!retriable || attempt === retries) break;
      // Honor Retry-After when present, else exponential backoff with jitter.
      const retryAfter = extractRetryAfterMs(err);
      const backoff = baseDelayMs * 2 ** attempt;
      const jitter = Math.random() * 400;
      const wait = retryAfter ?? backoff + jitter;
      console.log(
        `[Agent] ${label}: ${status ?? "error"} — retry ${attempt + 1}/${retries} in ${Math.round(wait)}ms`
      );
      await sleep(wait);
    }
  }
  throw lastErr;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function extractStatus(err: any): number | undefined {
  return (
    err?.status ??
    err?.response?.status ??
    err?.cause?.status ??
    (typeof err?.message === "string" && /\b(429|500|503|504)\b/.test(err.message)
      ? Number(err.message.match(/\b(429|500|503|504)\b/)![1])
      : undefined)
  );
}

function extractRetryAfterMs(err: any): number | undefined {
  const h = err?.headers ?? err?.response?.headers;
  const raw = h?.get?.("retry-after") ?? h?.["retry-after"];
  if (!raw) return undefined;
  const secs = Number(raw);
  return Number.isFinite(secs) ? secs * 1000 : undefined;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================================
// Node 1: Gather Company Information
// ============================================================================
export async function gatherInfoNode(
  state: ResearchStateType
): Promise<Partial<ResearchStateType>> {
  console.log(`[Agent] Gathering company information for: ${state.companyName}`);

  try {
    const searchTool = createSearchTool();
    const searchResults = await searchTool.invoke({
      query: `${state.companyName} company overview business model products services industry 2024 2025`,
    });

    const companyInfo = await invokeWithRetry(
      [
        new SystemMessage(
          `You are a financial research analyst. Given the search results about a company,
        synthesize the key information into a structured company profile. Include:
        1. Company Overview (what they do, their industry)
        2. Business Model (how they make money)
        3. Key Products/Services
        4. Competitive Position
        5. Recent Major Developments
        Be factual and concise.`
        ),
        new HumanMessage(
          `Company: ${state.companyName}\n\nSearch Results:\n${typeof searchResults === "string" ? searchResults : JSON.stringify(searchResults, null, 2)}`
        ),
      ],
      { label: "gatherInfo" }
    );

    return {
      companyInfo,
      currentStep: "company_info_gathered",
    };
  } catch (error) {
    console.error("[Agent] Error in gatherInfoNode:", error);
    return {
      companyInfo: `Unable to gather company info: ${error instanceof Error ? error.message : String(error)}`,
      currentStep: "company_info_gathered",
    };
  }
}

// ============================================================================
// Node 2: Gather Financial Data
// ============================================================================
export async function gatherFinancialsNode(
  state: ResearchStateType
): Promise<Partial<ResearchStateType>> {
  console.log(`[Agent] Gathering financial data for: ${state.companyName}`);

  try {
    // Step 1: Resolve the ticker via Yahoo's search endpoint (deterministic and
    // free) instead of spending an LLM call on it. This also removes one of the
    // ~8 model calls per analysis, easing the 429 pressure on NVIDIA NIM.
    const ticker = (await resolveTicker(state.companyName)) ?? "";

    if (!ticker) {
      // Use search as fallback for private companies
      const searchTool = createSearchTool();
      const searchResults = await searchTool.invoke({
        query: `${state.companyName} financial data revenue market cap valuation 2024 2025`,
      });
      return {
        financialData: `Company appears to be private. Search-based financial data:\n${typeof searchResults === "string" ? searchResults : JSON.stringify(searchResults, null, 2)}`,
        currentStep: "financials_gathered",
      };
    }

    // Step 2: Fetch real data from Yahoo Finance
    const yahooData = await fetchFinancialData.invoke({ ticker });

    // Parse the structured JSON so the UI can render charts. The tool returns
    // a JSON string on success, or an error string on failure — leave null then.
    let financialMetrics: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(yahooData);
      if (parsed && typeof parsed === "object") {
        financialMetrics = parsed as Record<string, unknown>;
      }
    } catch {
      // yahooData was an error message, not JSON.
    }

    // Step 3: Supplement with search for recent earnings & analyst opinions
    const searchTool = createSearchTool();
    const earningsSearch = await searchTool.invoke({
      query: `${state.companyName} ${ticker} latest earnings report quarterly results analyst rating 2025`,
    });

    const combinedData = `## Yahoo Finance Data (${ticker})\n${yahooData}\n\n## Recent Earnings & Analyst Coverage\n${typeof earningsSearch === "string" ? earningsSearch : JSON.stringify(earningsSearch, null, 2)}`;

    return {
      financialData: combinedData,
      financialMetrics,
      currentStep: "financials_gathered",
    };
  } catch (error) {
    console.error("[Agent] Error in gatherFinancialsNode:", error);
    return {
      financialData: `Unable to gather financial data: ${error instanceof Error ? error.message : String(error)}`,
      currentStep: "financials_gathered",
    };
  }
}

// ============================================================================
// Node 3: Gather News & Sentiment
// ============================================================================
export async function gatherNewsNode(
  state: ResearchStateType
): Promise<Partial<ResearchStateType>> {
  console.log(`[Agent] Gathering news & sentiment for: ${state.companyName}`);

  try {
    const searchTool = createSearchTool();

    // Search for recent news
    const newsResults = await searchTool.invoke({
      query: `${state.companyName} latest news market impact risks opportunities 2025`,
    });

    // Search for sentiment/analyst opinions
    const sentimentResults = await searchTool.invoke({
      query: `${state.companyName} stock analyst sentiment bullish bearish outlook 2025`,
    });

    const newsData = await invokeWithRetry(
      [
        new SystemMessage(
          `You are a financial news analyst. Analyze the following news and sentiment data.
        Produce a structured report with:
        1. Key Recent News Headlines (summarize the top 5 most impactful)
        2. Overall Market Sentiment (bullish/bearish/neutral with explanation)
        3. Key Risks Identified
        4. Key Opportunities/Catalysts
        5. Notable Analyst Opinions
        Be balanced and factual.`
        ),
        new HumanMessage(
          `Company: ${state.companyName}\n\nNews Data:\n${typeof newsResults === "string" ? newsResults : JSON.stringify(newsResults, null, 2)}\n\nSentiment Data:\n${typeof sentimentResults === "string" ? sentimentResults : JSON.stringify(sentimentResults, null, 2)}`
        ),
      ],
      { label: "gatherNews" }
    );

    return {
      newsData,
      currentStep: "news_gathered",
    };
  } catch (error) {
    console.error("[Agent] Error in gatherNewsNode:", error);
    return {
      newsData: `Unable to gather news data: ${error instanceof Error ? error.message : String(error)}`,
      currentStep: "news_gathered",
    };
  }
}

// ============================================================================
// Node 4: Analyze & Synthesize
// ============================================================================
export async function analyzeNode(
  state: ResearchStateType
): Promise<Partial<ResearchStateType>> {
  console.log(`[Agent] Analyzing all data for: ${state.companyName}`);

  try {
    const analysis = await invokeWithRetry(
      [
        new SystemMessage(
          `You are a senior investment analyst at a top-tier hedge fund. You have been given
        comprehensive data about a company. Your job is to write a thorough investment analysis report.
        
        Structure your analysis as follows:
        
        ## Executive Summary
        Brief overview of the company and key findings.
        
        ## Business Quality Assessment
        - Competitive moat analysis
        - Business model sustainability
        - Management quality indicators
        
        ## Financial Health
        - Revenue trends and growth
        - Profitability metrics
        - Balance sheet strength
        - Cash flow analysis
        - Valuation metrics (P/E, P/B, EV/EBITDA) relative to peers
        
        ## Growth Prospects
        - Market opportunity size
        - Growth drivers
        - Innovation pipeline
        
        ## Risk Assessment
        - Key business risks
        - Market risks
        - Regulatory/macro risks
        - Competitive threats
        
        ## Sentiment & Momentum
        - Current market sentiment
        - Analyst consensus
        - Recent catalysts
        
        Be rigorous, data-driven, and balanced. Cite specific numbers where available.`
        ),
        new HumanMessage(
          `Company: ${state.companyName}\n\n` +
            `--- COMPANY PROFILE ---\n${state.companyInfo}\n\n` +
            `--- FINANCIAL DATA ---\n${state.financialData}\n\n` +
            `--- NEWS & SENTIMENT ---\n${state.newsData}`
        ),
      ],
      { label: "analyze" }
    );

    return {
      analysis,
      currentStep: "analysis_complete",
    };
  } catch (error) {
    console.error("[Agent] Error in analyzeNode:", error);
    return {
      analysis: `Unable to complete analysis: ${error instanceof Error ? error.message : String(error)}`,
      currentStep: "analysis_complete",
    };
  }
}

// ============================================================================
// Node 5: Generate Final Recommendation
// ============================================================================
export async function recommendNode(
  state: ResearchStateType
): Promise<Partial<ResearchStateType>> {
  console.log(`[Agent] Generating recommendation for: ${state.companyName}`);

  try {
    const content = await invokeWithRetry(
      [
        new SystemMessage(
          `You are a decisive investment committee member. Based on the comprehensive analysis provided,
        you must make a final investment recommendation.

        The decision is a THREE-way verdict:
        - "INVEST": strong conviction, attractive risk/reward, act now.
        - "WATCH": promising but with unresolved risks or valuation concerns; monitor for a better entry.
        - "PASS": unattractive risk/reward; avoid.

        You MUST respond with a valid JSON object in EXACTLY this format (no markdown fences):
        {
          "decision": "INVEST" or "WATCH" or "PASS",
          "confidence": "HIGH" or "MEDIUM" or "LOW",
          "score": <integer 0-100 overall conviction score>,
          "targetTimeframe": "short-term (< 1 year)" or "medium-term (1-3 years)" or "long-term (3+ years)",
          "summary": "A 2-3 sentence executive summary of why you made this decision",
          "bullCase": ["point 1", "point 2", "point 3"],
          "bearCase": ["point 1", "point 2", "point 3"],
          "keyMetrics": { "metric_name": "metric_value" },
          "riskLevel": "LOW" or "MODERATE" or "HIGH" or "VERY HIGH",
          "catalysts": ["upcoming catalyst 1", "upcoming catalyst 2"],
          "moat": { "rating": "Wide" or "Narrow" or "None", "reasons": ["reason 1", "reason 2"] },
          "swot": {
            "strengths": ["...", "..."],
            "weaknesses": ["...", "..."],
            "opportunities": ["...", "..."],
            "threats": ["...", "..."]
          }
        }

        The "score" must be consistent with the decision (INVEST≈65-100, WATCH≈40-64, PASS≈0-39)
        and confidence. Be decisive. Your decision must be clearly justified by the analysis.
        Respond with ONLY the JSON object, no additional text.`
        ),
        new HumanMessage(
          `Company: ${state.companyName}\n\nFull Analysis:\n${state.analysis}`
        ),
      ],
      { label: "recommend" }
    );

    // Clean up potential markdown code fences
    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    return {
      recommendation: cleaned,
      currentStep: "complete",
    };
  } catch (error) {
    console.error("[Agent] Error in recommendNode:", error);
    return {
      recommendation: JSON.stringify({
        decision: "PASS",
        confidence: "LOW",
        score: 0,
        summary: `Unable to generate recommendation due to an error: ${error instanceof Error ? error.message : String(error)}`,
        bullCase: [],
        bearCase: ["Analysis could not be completed"],
        keyMetrics: {},
        riskLevel: "HIGH",
        catalysts: [],
      }),
      currentStep: "complete",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
