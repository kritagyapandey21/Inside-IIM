/**
 * Shared types for research + market data, used across the dashboard,
 * widgets, stores, and API routes.
 */

export type Verdict = "INVEST" | "WATCH" | "PASS";

export interface SWOT {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface Moat {
  rating: string; // e.g. "Wide" | "Narrow" | "None"
  reasons: string[];
}

export interface Recommendation {
  decision: Verdict | string;
  confidence: string;
  /** 0-100 composite score shown in the AI Recommendation gauge. */
  score?: number;
  targetTimeframe?: string;
  summary: string;
  bullCase: string[];
  bearCase: string[];
  keyMetrics: Record<string, string>;
  riskLevel: string;
  catalysts: string[];
  swot?: SWOT;
  moat?: Moat;
}

/** Structured numeric financial data from Yahoo Finance (quote + key stats). */
export interface FinancialMetrics {
  symbol?: string;
  shortName?: string;
  /** ISO currency code the instrument trades in, e.g. "USD", "INR", "GBp". */
  currency?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  averageVolume?: number;
  totalRevenue?: number;
  revenueGrowth?: number;
  profitMargins?: number;
  operatingMargins?: number;
  grossMargins?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  freeCashflow?: number;
  operatingCashflow?: number;
  targetMeanPrice?: number;
  targetHighPrice?: number;
  targetLowPrice?: number;
  recommendationKey?: string;
  recommendationMean?: number;
  numberOfAnalystOpinions?: number;
  beta?: number;
  priceToBook?: number;
  enterpriseToEbitda?: number;
  enterpriseToRevenue?: number;
  earningsGrowth?: number;
  [key: string]: unknown;
}

export interface PricePoint {
  date: string; // ISO
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceHistory {
  range: string;
  currency?: string;
  points: PricePoint[];
}

export interface FundamentalRow {
  /** Fiscal period label, e.g. "2021", "2022", "TTM". */
  period: string;
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  eps?: number;
  freeCashFlow?: number;
  operatingCashFlow?: number;
  totalAssets?: number;
  totalDebt?: number;
  totalEquity?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
}

export interface AnalystTrend {
  period: string; // "0m", "-1m" etc.
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface UpgradeDowngrade {
  date: string;
  firm: string;
  toGrade: string;
  fromGrade?: string;
  action?: string;
}

export interface HolderRow {
  name: string;
  pctHeld?: number;
  shares?: number;
  value?: number;
  dateReported?: string;
}

export interface InsiderTxn {
  name: string;
  relation?: string;
  transaction?: string;
  shares?: number;
  value?: number;
  date?: string;
}

export interface OwnershipBreakdown {
  insidersPercentHeld?: number;
  institutionsPercentHeld?: number;
  institutionsFloatPercentHeld?: number;
  institutionsCount?: number;
}

export interface DividendPoint {
  date: string;
  amount: number;
}

export interface CalendarEvent {
  label: string;
  date: string;
}

export interface CompanyProfile {
  symbol: string;
  shortName?: string;
  longName?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  website?: string;
  country?: string;
  employees?: number;
  summary?: string;
}

export interface Comparable {
  symbol: string;
  name?: string;
  currency?: string;
  price?: number;
  changePercent?: number;
  marketCap?: number;
  trailingPE?: number;
}

/** The full fast-lane payload from /api/market. Any field may be null. */
export interface MarketData {
  profile: CompanyProfile;
  metrics: FinancialMetrics;
  priceHistory: PriceHistory | null;
  fundamentals: FundamentalRow[] | null;
  analystTrend: AnalystTrend[] | null;
  upgrades: UpgradeDowngrade[] | null;
  institutions: HolderRow[] | null;
  funds: HolderRow[] | null;
  insiders: InsiderTxn[] | null;
  ownership: OwnershipBreakdown | null;
  dividends: DividendPoint[] | null;
  calendar: CalendarEvent[] | null;
  comparables: Comparable[] | null;
  fetchedAt: number;
}

export interface ResearchResult {
  companyName: string;
  recommendation: Recommendation;
  analysis: string;
  companyInfo: string;
  financialData: string;
  financialMetrics?: FinancialMetrics | null;
  newsData: string;
}

/** A research result persisted to history with metadata. */
export interface SavedResult {
  id: string;
  result: ResearchResult;
  savedAt: number;
}
