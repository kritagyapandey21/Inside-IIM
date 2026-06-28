import type { WidgetMeta, WidgetType, WidgetInstance } from "./types";

/**
 * Metadata for every widget. The grid uses 12 columns at `lg`. Row height is
 * ~40px (see DashboardGrid), so h:6 ≈ 240px.
 * Only widgets backed by real Yahoo/AI data appear here — no fabricated panels.
 */
export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  "ai-recommendation": { type: "ai-recommendation", title: "AI Recommendation", description: "INVEST / WATCH / PASS verdict with conviction score.", source: "ai", w: 4, h: 6, minW: 3, minH: 5, tabs: ["overview"] },
  "executive-summary": { type: "executive-summary", title: "Executive Summary", description: "AI thesis summary of the company.", source: "ai", w: 4, h: 6, minW: 3, minH: 4, tabs: ["overview"] },
  "price-chart": { type: "price-chart", title: "Price Overview", description: "Intraday → 5Y price with range selector.", source: "market", w: 5, h: 6, minW: 4, minH: 5, tabs: ["overview"] },
  "stock-performance": { type: "stock-performance", title: "Stock Performance", description: "1Y area chart of closing price.", source: "market", w: 4, h: 6, minW: 3, minH: 5, tabs: ["overview", "financials"] },
  "key-metrics": { type: "key-metrics", title: "Key Metrics", description: "Market cap, P/E, revenue, ROE tiles.", source: "market", w: 3, h: 6, minW: 3, minH: 4, tabs: ["overview", "financials"] },
  valuation: { type: "valuation", title: "Valuation", description: "P/E, P/B, EV/EBITDA, price vs target.", source: "market", w: 4, h: 6, minW: 3, minH: 5, tabs: ["overview", "valuation"] },
  "revenue-growth": { type: "revenue-growth", title: "Revenue Growth", description: "Annual revenue with YoY growth.", source: "market", w: 4, h: 6, minW: 3, minH: 5, tabs: ["overview", "financials"] },
  "financial-health": { type: "financial-health", title: "Financial Health", description: "Margins, liquidity, leverage gauges.", source: "market", w: 4, h: 6, minW: 3, minH: 5, tabs: ["overview", "financials"] },
  "business-health": { type: "business-health", title: "Business Health", description: "Radar of profitability, growth, efficiency, margins from real metrics.", source: "market", w: 4, h: 6, minW: 3, minH: 5, tabs: ["overview", "financials"] },
  "key-financials": { type: "key-financials", title: "Key Financials", description: "Multi-year income statement table.", source: "market", w: 5, h: 6, minW: 4, minH: 5, tabs: ["overview", "financials"] },
  "analyst-consensus": { type: "analyst-consensus", title: "Analyst Consensus", description: "Buy/Hold/Sell trend + price target.", source: "market", w: 4, h: 6, minW: 3, minH: 5, tabs: ["overview", "valuation"] },
  "investment-thesis": { type: "investment-thesis", title: "Investment Thesis", description: "Bull case, bear case, catalysts.", source: "ai", w: 4, h: 6, minW: 3, minH: 5, tabs: ["overview"] },
  "bull-thesis": { type: "bull-thesis", title: "Bull Thesis", description: "The case to invest.", source: "ai", w: 3, h: 6, minW: 2, minH: 4, tabs: ["overview"] },
  "bear-thesis": { type: "bear-thesis", title: "Bear Thesis", description: "The case to avoid.", source: "ai", w: 3, h: 6, minW: 2, minH: 4, tabs: ["overview"] },
  "risk-score": { type: "risk-score", title: "Risk Score", description: "Risk level and key risk factors.", source: "ai", w: 3, h: 6, minW: 2, minH: 4, tabs: ["overview"] },
  swot: { type: "swot", title: "SWOT Analysis", description: "Strengths, weaknesses, opportunities, threats.", source: "ai", w: 6, h: 6, minW: 4, minH: 5, tabs: ["overview"] },
  moat: { type: "moat", title: "Moat Analysis", description: "Competitive moat rating and reasons.", source: "ai", w: 3, h: 5, minW: 2, minH: 4, tabs: ["overview"] },
  "institutional-ownership": { type: "institutional-ownership", title: "Institutional Ownership", description: "Top holders and ownership breakdown.", source: "market", w: 4, h: 6, minW: 3, minH: 5, tabs: ["overview", "peers"] },
  "insider-activity": { type: "insider-activity", title: "Insider Activity", description: "Recent insider transactions.", source: "market", w: 4, h: 6, minW: 3, minH: 5, tabs: ["overview", "peers"] },
  "recent-catalysts": { type: "recent-catalysts", title: "Recent Catalysts", description: "Upcoming events and earnings dates.", source: "ai", w: 4, h: 5, minW: 3, minH: 4, tabs: ["overview", "news"] },
  "news-sentiment": { type: "news-sentiment", title: "News Sentiment", description: "Market sentiment from recent news.", source: "ai", w: 4, h: 6, minW: 3, minH: 4, tabs: ["overview", "news"] },
  comparables: { type: "comparables", title: "Comparable Companies", description: "Peer companies and valuation.", source: "market", w: 5, h: 6, minW: 4, minH: 4, tabs: ["overview", "peers"] },
  dividends: { type: "dividends", title: "Dividend History", description: "Historical dividend payments.", source: "market", w: 4, h: 5, minW: 3, minH: 4, tabs: ["overview", "financials"] },
  notes: { type: "notes", title: "Notes", description: "Your private notes on this company.", source: "local", w: 4, h: 5, minW: 3, minH: 3, tabs: ["overview", "notes"] },
  "ai-chat": { type: "ai-chat", title: "AI Chat", description: "Ask follow-up questions about this company.", source: "local", w: 4, h: 8, minW: 3, minH: 5, tabs: ["overview", "notes"] },
};

export const ALL_WIDGET_TYPES = Object.keys(WIDGET_META) as WidgetType[];

let idCounter = 0;
export function newWidgetId(type: WidgetType): string {
  idCounter += 1;
  return `${type}-${Date.now().toString(36)}-${idCounter}`;
}

/**
 * The curated default dashboard — an ordered list of widgets. The CSS-grid
 * layout engine places them left-to-right, top-to-bottom honouring each
 * widget's `w`/`h` (with `grid-auto-flow: dense` to fill gaps). Sizes here are
 * tuned per-widget so the default view reads like a designed page, not a dump.
 */
export function buildDefaultDashboard(): { widgets: WidgetInstance[] } {
  // [type, w, h]
  const spec: [WidgetType, number, number][] = [
    ["ai-recommendation", 4, 6],
    ["price-chart", 5, 6],
    ["key-metrics", 3, 6],
    ["business-health", 4, 6],
    ["revenue-growth", 4, 6],
    ["investment-thesis", 4, 6],
    ["key-financials", 5, 6],
    ["recent-catalysts", 3, 6],
    ["news-sentiment", 4, 6],
    ["valuation", 4, 6],
    ["analyst-consensus", 4, 6],
    ["comparables", 5, 6],
    ["financial-health", 4, 6],
    ["stock-performance", 4, 6],
    ["notes", 4, 6],
    ["ai-chat", 4, 8],
  ];

  const widgets: WidgetInstance[] = spec.map(([type, w, h]) => ({
    id: newWidgetId(type),
    type,
    w,
    h,
  }));

  return { widgets };
}
