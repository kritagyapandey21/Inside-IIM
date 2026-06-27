"use client";

import type { ComponentType } from "react";
import type { WidgetType } from "./types";
import {
  AIRecommendation,
  ExecutiveSummary,
  InvestmentThesis,
  BullThesis,
  BearThesis,
  RiskScore,
  SWOTWidget,
  MoatWidget,
  RecentCatalysts,
  NewsSentiment,
} from "@/components/widgets/aiWidgets";
import {
  PriceChart,
  StockPerformance,
  KeyMetrics,
  Valuation,
  RevenueGrowth,
  FinancialHealth,
  BusinessHealth,
  KeyFinancials,
  AnalystConsensus,
  InstitutionalOwnership,
  InsiderActivity,
  Comparables,
  Dividends,
} from "@/components/widgets/marketWidgets";
import { Notes, AIChat } from "@/components/widgets/localWidgets";

/** Maps every widget type to its body component. */
export const WIDGET_COMPONENTS: Record<WidgetType, ComponentType> = {
  "ai-recommendation": AIRecommendation,
  "executive-summary": ExecutiveSummary,
  "price-chart": PriceChart,
  "stock-performance": StockPerformance,
  "key-metrics": KeyMetrics,
  valuation: Valuation,
  "revenue-growth": RevenueGrowth,
  "financial-health": FinancialHealth,
  "business-health": BusinessHealth,
  "key-financials": KeyFinancials,
  "analyst-consensus": AnalystConsensus,
  "investment-thesis": InvestmentThesis,
  "bull-thesis": BullThesis,
  "bear-thesis": BearThesis,
  "risk-score": RiskScore,
  swot: SWOTWidget,
  moat: MoatWidget,
  "institutional-ownership": InstitutionalOwnership,
  "insider-activity": InsiderActivity,
  "recent-catalysts": RecentCatalysts,
  "news-sentiment": NewsSentiment,
  comparables: Comparables,
  dividends: Dividends,
  notes: Notes,
  "ai-chat": AIChat,
};
