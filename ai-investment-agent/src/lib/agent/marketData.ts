/**
 * Fast-lane market data layer — typed Yahoo Finance v3 fetchers powering the
 * dashboard's chart/financial widgets. Every fetcher is defensive: on any
 * failure it returns null so the widget can show an honest empty state.
 *
 * yahoo-finance2 v3: the default export is a class that must be instantiated.
 */
import type {
  MarketData,
  CompanyProfile,
  FinancialMetrics,
  PriceHistory,
  PricePoint,
  FundamentalRow,
  AnalystTrend,
  UpgradeDowngrade,
  HolderRow,
  InsiderTxn,
  OwnershipBreakdown,
  DividendPoint,
  CalendarEvent,
  Comparable,
} from "../types";
import { KNOWN_COMPANIES } from "./knownCompanies";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function client() {
  const mod = await import("yahoo-finance2");
  const YahooFinance = mod.default as any;
  return new YahooFinance({ suppressNotices: ["yahooSurvey"] });
}

/** Classic Levenshtein edit distance — small inputs only (ticker/name search). */
function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/**
 * Typo-tolerant fallback against a curated list of well-known tickers — used
 * only when Yahoo's own (prefix/token) search comes back empty, e.g.
 * "relience" doesn't prefix-match "Reliance Industries" on Yahoo's index but
 * is within edit-distance 2 of it.
 */
function fuzzyMatchKnownCompanies(query: string): { symbol: string; name: string }[] {
  const q = query.toLowerCase();
  const scored = KNOWN_COMPANIES.map((c) => {
    const name = c.name.toLowerCase();
    // Compare against the first word of the name too (e.g. "apple" vs "apple inc.")
    const firstWord = name.split(/[\s,.]/)[0];
    const dist = Math.min(editDistance(q, name), editDistance(q, firstWord));
    return { ...c, dist };
  });
  const maxDist = q.length <= 4 ? 1 : 2;
  return scored
    .filter((c) => c.dist <= maxDist)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5)
    .map(({ symbol, name }) => ({ symbol, name }));
}

const num = (v: unknown): number | undefined =>
  typeof v === "number" && !Number.isNaN(v) ? v : undefined;

/**
 * Resolve a free-text company name OR ticker to a Yahoo symbol.
 *
 * Yahoo's search endpoint handles both ("Apple" → AAPL, "NVIDIA" → NVDA,
 * "AAPL" → AAPL), so we route everything through it. When the query is itself
 * one of the returned symbols we prefer that exact match; otherwise we take the
 * first equity. As a last resort, a short symbol-shaped query is returned
 * as-is so direct ticker entry still works even if search is unavailable.
 */
export async function resolveTicker(query: string): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;
  const looksTickery = /^[A-Za-z][A-Za-z.\-]{0,6}$/.test(q) && !q.includes(" ");
  try {
    const yf = await client();
    const res: any = await yf.search(q, { quotesCount: 8, newsCount: 0 });
    const quotes: any[] = (res.quotes ?? []).filter((x: any) => x.symbol);
    // Exact symbol match (case-insensitive) wins — e.g. user typed a ticker.
    const exact = quotes.find(
      (x) => x.symbol.toUpperCase() === q.toUpperCase()
    );
    if (exact) return exact.symbol;
    const equity = quotes.find((x) => x.quoteType === "EQUITY");
    if (equity) return equity.symbol;
    if (quotes[0]) return quotes[0].symbol;
  } catch {
    /* fall through to the symbol-shaped fallback below */
  }
  return looksTickery ? q.toUpperCase() : null;
}

export interface CompanySearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
}

/**
 * Live autocomplete suggestions for the search/command palette as the user
 * types — same Yahoo search index as resolveTicker, but returns the full
 * candidate list (not just the best match) so the UI can render a dropdown.
 */
export async function searchCompanies(query: string): Promise<CompanySearchResult[]> {
  const q = query.trim();
  if (!q || q.length < 1) return [];
  try {
    const yf = await client();
    const res: any = await yf.search(q, { quotesCount: 8, newsCount: 0 });
    const quotes: any[] = (res.quotes ?? []).filter(
      (x: any) => x.symbol && (x.quoteType === "EQUITY" || x.quoteType === "ETF")
    );
    if (quotes.length > 0) {
      return quotes.map((x) => ({
        symbol: x.symbol,
        name: x.shortname || x.longname || x.symbol,
        exchange: x.exchange,
        type: x.quoteType,
      }));
    }
  } catch {
    /* fall through to the fuzzy fallback below */
  }
  // Yahoo's search is prefix/token-based and won't catch a genuine typo
  // (e.g. "relience" vs "Reliance") — try a small edit-distance match
  // against well-known tickers before giving up.
  return fuzzyMatchKnownCompanies(q);
}

async function getQuoteAndStats(
  yf: any,
  ticker: string
): Promise<{ metrics: FinancialMetrics; profile: CompanyProfile }> {
  const quote: any = await yf.quote(ticker);
  if (!quote || !quote.symbol) {
    throw new Error(`No market data available for "${ticker}".`);
  }
  let s: any = {};
  try {
    s = await yf.quoteSummary(ticker, {
      modules: [
        "financialData",
        "defaultKeyStatistics",
        "summaryDetail",
        "summaryProfile",
      ],
    });
  } catch {
    s = {};
  }
  const fd = s.financialData ?? {};
  const ks = s.defaultKeyStatistics ?? {};
  const sd = s.summaryDetail ?? {};
  const sp = s.summaryProfile ?? {};

  const metrics: FinancialMetrics = {
    symbol: quote.symbol,
    shortName: quote.shortName ?? quote.longName,
    currency: quote.currency ?? quote.financialCurrency,
    regularMarketPrice: num(quote.regularMarketPrice),
    regularMarketChange: num(quote.regularMarketChange),
    regularMarketChangePercent: num(quote.regularMarketChangePercent),
    marketCap: num(quote.marketCap),
    trailingPE: num(quote.trailingPE ?? sd.trailingPE),
    forwardPE: num(quote.forwardPE ?? sd.forwardPE),
    dividendYield: num(sd.dividendYield),
    fiftyTwoWeekHigh: num(quote.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(quote.fiftyTwoWeekLow),
    averageVolume: num(quote.averageDailyVolume3Month ?? quote.averageVolume),
    totalRevenue: num(fd.totalRevenue),
    revenueGrowth: num(fd.revenueGrowth),
    earningsGrowth: num(fd.earningsGrowth),
    profitMargins: num(fd.profitMargins ?? ks.profitMargins),
    operatingMargins: num(fd.operatingMargins),
    grossMargins: num(fd.grossMargins),
    returnOnEquity: num(fd.returnOnEquity),
    returnOnAssets: num(fd.returnOnAssets),
    debtToEquity: num(fd.debtToEquity),
    currentRatio: num(fd.currentRatio),
    quickRatio: num(fd.quickRatio),
    freeCashflow: num(fd.freeCashflow),
    operatingCashflow: num(fd.operatingCashflow),
    targetMeanPrice: num(fd.targetMeanPrice),
    targetHighPrice: num(fd.targetHighPrice),
    targetLowPrice: num(fd.targetLowPrice),
    recommendationKey: fd.recommendationKey,
    recommendationMean: num(fd.recommendationMean),
    numberOfAnalystOpinions: num(fd.numberOfAnalystOpinions),
    beta: num(ks.beta ?? sd.beta),
    priceToBook: num(ks.priceToBook),
    enterpriseToEbitda: num(ks.enterpriseToEbitda),
    enterpriseToRevenue: num(ks.enterpriseToRevenue),
  };

  const profile: CompanyProfile = {
    symbol: quote.symbol,
    shortName: quote.shortName,
    longName: quote.longName ?? quote.shortName,
    exchange: quote.fullExchangeName ?? quote.exchange,
    sector: sp.sector,
    industry: sp.industry,
    website: sp.website,
    country: sp.country,
    employees: num(sp.fullTimeEmployees),
    summary: sp.longBusinessSummary,
  };

  return { metrics, profile };
}

function rangeToParams(range: string): { period1: Date; interval: any } {
  const now = new Date();
  const d = (days: number) =>
    new Date(now.getTime() - days * 24 * 3600 * 1000);
  switch (range) {
    case "1D":
      return { period1: d(1), interval: "5m" };
    case "1W":
      return { period1: d(7), interval: "30m" };
    case "1M":
      return { period1: d(31), interval: "1d" };
    case "1Y":
      return { period1: d(365), interval: "1d" };
    case "5Y":
      return { period1: d(365 * 5), interval: "1wk" };
    default:
      return { period1: d(365), interval: "1d" };
  }
}

export async function getPriceHistory(
  yf: any,
  ticker: string,
  range = "1Y"
): Promise<PriceHistory | null> {
  try {
    const { period1, interval } = rangeToParams(range);
    const c: any = await yf.chart(ticker, { period1, interval });
    const points: PricePoint[] = (c.quotes ?? [])
      .filter((q: any) => q.close != null)
      .map((q: any) => ({
        date: new Date(q.date).toISOString(),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume ?? 0,
      }));
    if (points.length === 0) return null;
    return { range, currency: c.meta?.currency, points };
  } catch {
    return null;
  }
}

export async function getFundamentals(
  yf: any,
  ticker: string
): Promise<FundamentalRow[] | null> {
  try {
    const period1 = new Date(Date.now() - 365 * 6 * 24 * 3600 * 1000);
    const f: any[] = await yf.fundamentalsTimeSeries(ticker, {
      period1,
      type: "annual",
      module: "all",
    });
    if (!Array.isArray(f) || f.length === 0) return null;
    const rows: FundamentalRow[] = f
      .map((r) => {
        const revenue = num(r.totalRevenue);
        const grossProfit = num(r.grossProfit);
        const operatingIncome = num(r.operatingIncome);
        const netIncome = num(r.netIncome ?? r.netIncomeCommonStockholders);
        return {
          period: r.date ? new Date(r.date).getFullYear().toString() : "—",
          revenue,
          grossProfit,
          operatingIncome,
          netIncome,
          eps: num(r.dilutedEPS ?? r.basicEPS),
          freeCashFlow: num(r.freeCashFlow),
          operatingCashFlow: num(r.operatingCashFlow),
          totalAssets: num(r.totalAssets),
          totalDebt: num(r.totalDebt),
          totalEquity: num(r.stockholdersEquity ?? r.commonStockEquity),
          grossMargin:
            revenue && grossProfit ? grossProfit / revenue : undefined,
          operatingMargin:
            revenue && operatingIncome ? operatingIncome / revenue : undefined,
          netMargin: revenue && netIncome ? netIncome / revenue : undefined,
        };
      })
      // Drop phantom rows: Yahoo's time-series often returns a leading or
      // trailing fiscal year that has a date but no actual figures, which
      // rendered as an all-"—" column (the bug in the screenshot). A row is
      // only kept if it carries at least one real income-statement number, and
      // never with an unknown period.
      .filter(
        (r) =>
          r.period !== "—" &&
          (r.revenue != null || r.netIncome != null || r.eps != null)
      )
      // De-duplicate by fiscal year (the API can emit two partial rows for the
      // same year), preferring the one with revenue populated.
      .reduce<FundamentalRow[]>((acc, r) => {
        const existing = acc.find((x) => x.period === r.period);
        if (!existing) acc.push(r);
        else if (existing.revenue == null && r.revenue != null) {
          Object.assign(existing, r);
        }
        return acc;
      }, [])
      .sort((a, b) => a.period.localeCompare(b.period))
      // Keep at most the five most recent complete fiscal years.
      .slice(-5);
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

async function getAnalyst(
  yf: any,
  ticker: string
): Promise<{ trend: AnalystTrend[] | null; upgrades: UpgradeDowngrade[] | null }> {
  try {
    const s: any = await yf.quoteSummary(ticker, {
      modules: ["recommendationTrend", "upgradeDowngradeHistory"],
    });
    const trend: AnalystTrend[] | null =
      s.recommendationTrend?.trend?.map((t: any) => ({
        period: t.period,
        strongBuy: t.strongBuy ?? 0,
        buy: t.buy ?? 0,
        hold: t.hold ?? 0,
        sell: t.sell ?? 0,
        strongSell: t.strongSell ?? 0,
      })) ?? null;
    const upgrades: UpgradeDowngrade[] | null =
      s.upgradeDowngradeHistory?.history?.slice(0, 12).map((h: any) => ({
        date: h.epochGradeDate
          ? new Date(h.epochGradeDate).toISOString()
          : "",
        firm: h.firm,
        toGrade: h.toGrade,
        fromGrade: h.fromGrade,
        action: h.action,
      })) ?? null;
    return { trend, upgrades };
  } catch {
    return { trend: null, upgrades: null };
  }
}

async function getOwnership(yf: any, ticker: string) {
  try {
    const s: any = await yf.quoteSummary(ticker, {
      modules: [
        "institutionOwnership",
        "fundOwnership",
        "insiderTransactions",
        "majorHoldersBreakdown",
      ],
    });
    const mapHolder = (x: any): HolderRow => ({
      name: x.organization,
      pctHeld: num(x.pctHeld),
      shares: num(x.position),
      value: num(x.value),
      dateReported: x.reportDate ? new Date(x.reportDate).toISOString() : undefined,
    });
    const institutions: HolderRow[] | null =
      s.institutionOwnership?.ownershipList?.slice(0, 10).map(mapHolder) ?? null;
    const funds: HolderRow[] | null =
      s.fundOwnership?.ownershipList?.slice(0, 10).map(mapHolder) ?? null;
    const insiders: InsiderTxn[] | null =
      s.insiderTransactions?.transactions?.slice(0, 15).map((t: any) => ({
        name: t.filerName,
        relation: t.filerRelation,
        transaction: t.transactionText,
        shares: num(t.shares),
        value: num(t.value),
        date: t.startDate ? new Date(t.startDate).toISOString() : undefined,
      })) ?? null;
    const mh = s.majorHoldersBreakdown;
    const ownership: OwnershipBreakdown | null = mh
      ? {
          insidersPercentHeld: num(mh.insidersPercentHeld),
          institutionsPercentHeld: num(mh.institutionsPercentHeld),
          institutionsFloatPercentHeld: num(mh.institutionsFloatPercentHeld),
          institutionsCount: num(mh.institutionsCount),
        }
      : null;
    return { institutions, funds, insiders, ownership };
  } catch {
    return { institutions: null, funds: null, insiders: null, ownership: null };
  }
}

async function getDividendsAndCalendar(yf: any, ticker: string) {
  let dividends: DividendPoint[] | null = null;
  let calendar: CalendarEvent[] | null = null;
  try {
    const c: any = await yf.chart(ticker, {
      period1: new Date(Date.now() - 365 * 6 * 24 * 3600 * 1000),
      interval: "1d",
      events: "div",
    });
    const divs = c.events?.dividends;
    if (divs) {
      const list = Array.isArray(divs) ? divs : Object.values(divs);
      dividends = list
        .map((d: any) => ({
          date: new Date(d.date).toISOString(),
          amount: d.amount,
        }))
        .filter((d: DividendPoint) => d.amount != null);
      if (dividends.length === 0) dividends = null;
    }
  } catch {
    dividends = null;
  }
  try {
    const s: any = await yf.quoteSummary(ticker, { modules: ["calendarEvents"] });
    const ce = s.calendarEvents;
    const events: CalendarEvent[] = [];
    const ed = ce?.earnings?.earningsDate?.[0];
    if (ed) events.push({ label: "Next Earnings", date: new Date(ed).toISOString() });
    if (ce?.exDividendDate)
      events.push({ label: "Ex-Dividend", date: new Date(ce.exDividendDate).toISOString() });
    if (ce?.dividendDate)
      events.push({ label: "Dividend Pay", date: new Date(ce.dividendDate).toISOString() });
    calendar = events.length ? events : null;
  } catch {
    calendar = null;
  }
  return { dividends, calendar };
}

async function getComparables(
  yf: any,
  ticker: string
): Promise<Comparable[] | null> {
  try {
    const r: any = await yf.recommendationsBySymbol(ticker);
    const syms: string[] = (r.recommendedSymbols ?? [])
      .map((x: any) => x.symbol)
      .slice(0, 6);
    if (syms.length === 0) return null;
    const quotes: any = await yf.quote(syms);
    const list: any[] = Array.isArray(quotes) ? quotes : [quotes];
    return list.map((q) => ({
      symbol: q.symbol,
      name: q.shortName,
      currency: q.currency,
      price: num(q.regularMarketPrice),
      changePercent: num(q.regularMarketChangePercent),
      marketCap: num(q.marketCap),
      trailingPE: num(q.trailingPE),
    }));
  } catch {
    return null;
  }
}

/**
 * Fetch the complete market-data payload for a resolved ticker. Independent
 * fetchers run in parallel; each tolerates failure with a null section.
 */
export async function getMarketData(
  ticker: string,
  range = "1Y"
): Promise<MarketData> {
  const yf = await client();
  const [
    coreRes,
    priceHistory,
    fundamentals,
    analyst,
    own,
    divCal,
    comparables,
  ] = await Promise.all([
    getQuoteAndStats(yf, ticker),
    getPriceHistory(yf, ticker, range),
    getFundamentals(yf, ticker),
    getAnalyst(yf, ticker),
    getOwnership(yf, ticker),
    getDividendsAndCalendar(yf, ticker),
    getComparables(yf, ticker),
  ]);

  return {
    profile: coreRes.profile,
    metrics: coreRes.metrics,
    priceHistory,
    fundamentals,
    analystTrend: analyst.trend,
    upgrades: analyst.upgrades,
    institutions: own.institutions,
    funds: own.funds,
    insiders: own.insiders,
    ownership: own.ownership,
    dividends: divCal.dividends,
    calendar: divCal.calendar,
    comparables,
    fetchedAt: Date.now(),
  };
}
