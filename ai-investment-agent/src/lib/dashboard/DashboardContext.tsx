"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MarketData, ResearchResult } from "@/lib/types";

interface DashboardContextValue {
  /** Resolved ticker + display name of the active company. */
  ticker: string | null;
  companyName: string | null;

  market: MarketData | null;
  marketLoading: boolean;
  marketError: string | null;

  research: ResearchResult | null;
  researchLoading: boolean;
  researchError: string | null;
  /** Loosely-tracked AI progress step (0-4) for the loading UI. */
  researchStep: number;

  /** Run both the fast (market) and slow (AI) lanes for a company. */
  analyze: (query: string) => Promise<void>;
  /** Re-fetch only the fast market lane (e.g. range change / refresh). */
  refreshMarket: (range?: string) => Promise<void>;
  /** Load a previously saved research result instantly (no network). */
  loadResearch: (result: ResearchResult) => void;
  clear: () => void;
}

const Ctx = createContext<DashboardContextValue | null>(null);

export function useDashboardData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboardData must be used within DashboardDataProvider");
  return ctx;
}

const RESEARCH_STEPS = 5;

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const [ticker, setTicker] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  const [market, setMarket] = useState<MarketData | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);

  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchStep, setResearchStep] = useState(0);

  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bumped on every analyze()/loadResearch() call. In-flight fetches capture
  // the token they were issued with and discard their result if a newer
  // request has started by the time they resolve — otherwise an old, slow
  // response (e.g. a retried AI call) can land after a newer search and
  // silently overwrite it, making the new search look like it "didn't work".
  const marketToken = useRef(0);
  const researchToken = useRef(0);

  const fetchMarket = useCallback(
    async (query: string, range = "1Y") => {
      const token = ++marketToken.current;
      setMarketLoading(true);
      setMarketError(null);
      try {
        const res = await fetch(
          `/api/market?q=${encodeURIComponent(query)}&range=${range}`
        );
        const json = await res.json();
        if (token !== marketToken.current) return null; // superseded — drop it
        if (!res.ok) throw new Error(json.error || "Market data failed");
        setTicker(json.ticker);
        setMarket(json.data as MarketData);
        if (json.data?.profile?.longName) {
          setCompanyName(json.data.profile.longName);
        }
        return json.ticker as string;
      } catch (e) {
        if (token !== marketToken.current) return null;
        setMarketError(e instanceof Error ? e.message : "Market data failed");
        return null;
      } finally {
        if (token === marketToken.current) setMarketLoading(false);
      }
    },
    []
  );

  const refreshMarket = useCallback(
    async (range = "1Y") => {
      const q = ticker ?? companyName;
      if (q) await fetchMarket(q, range);
    },
    [ticker, companyName, fetchMarket]
  );

  const fetchResearch = useCallback(async (query: string) => {
    const token = ++researchToken.current;
    setResearchLoading(true);
    setResearchError(null);
    setResearch(null);
    setResearchStep(0);
    if (stepTimer.current) clearInterval(stepTimer.current);
    stepTimer.current = setInterval(() => {
      if (token !== researchToken.current) return;
      setResearchStep((s) => (s < RESEARCH_STEPS - 1 ? s + 1 : s));
    }, 12000);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: query }),
      });
      const json = await res.json();
      if (token !== researchToken.current) return; // a newer analyze() has since started
      if (!res.ok) throw new Error(json.error || "Research failed");
      setResearch(json.data as ResearchResult);
    } catch (e) {
      if (token !== researchToken.current) return;
      setResearchError(e instanceof Error ? e.message : "Research failed");
    } finally {
      if (stepTimer.current) clearInterval(stepTimer.current);
      if (token === researchToken.current) setResearchLoading(false);
    }
  }, []);

  const analyze = useCallback(
    async (query: string) => {
      setCompanyName(query);
      // Fast lane and slow lane run concurrently; market resolves first.
      void fetchMarket(query);
      await fetchResearch(query);
    },
    [fetchMarket, fetchResearch]
  );

  const loadResearch = useCallback(
    (result: ResearchResult) => {
      // Invalidate any in-flight analyze() so its eventual response can't
      // clobber this instantly-loaded result.
      researchToken.current += 1;
      setResearch(result);
      setResearchError(null);
      setResearchLoading(false);
      setCompanyName(result.companyName);
      // Refresh market data for the loaded company in the background.
      void fetchMarket(result.companyName);
    },
    [fetchMarket]
  );

  const clear = useCallback(() => {
    setTicker(null);
    setCompanyName(null);
    setMarket(null);
    setResearch(null);
    setMarketError(null);
    setResearchError(null);
  }, []);

  const value = useMemo<DashboardContextValue>(
    () => ({
      ticker,
      companyName,
      market,
      marketLoading,
      marketError,
      research,
      researchLoading,
      researchError,
      researchStep,
      analyze,
      refreshMarket,
      loadResearch,
      clear,
    }),
    [
      ticker,
      companyName,
      market,
      marketLoading,
      marketError,
      research,
      researchLoading,
      researchError,
      researchStep,
      analyze,
      refreshMarket,
      loadResearch,
      clear,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
