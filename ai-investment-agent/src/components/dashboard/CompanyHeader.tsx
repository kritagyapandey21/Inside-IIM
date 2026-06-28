"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Share2,
  MoreHorizontal,
  Save,
  RotateCcw,
  Download,
  Upload,
  Presentation,
  Printer,
  Sun,
  Moon,
  Star,
  Search,
  RefreshCw,
  Check,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useDashboardData } from "@/lib/dashboard/DashboardContext";
import type { DashboardStore } from "@/lib/dashboard/useDashboardStore";
import { VERDICT_COLOR } from "@/components/widgets/parts";
import CompanyLogo from "@/components/CompanyLogo";
import { cn, fmtCompact, fmtMoney, fmtNum } from "@/lib/utils";

export type DashTab =
  | "overview"
  | "financials"
  | "valuation"
  | "news"
  | "peers"
  | "notes";

export const TABS: { id: DashTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "financials", label: "Financials" },
  { id: "valuation", label: "Valuation" },
  { id: "news", label: "News" },
  { id: "peers", label: "Peers" },
  { id: "notes", label: "Notes" },
];

function relativeTime(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

/** A single number in the KPI strip. */
function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="mono text-sm font-semibold leading-none" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </div>
  );
}

export default function CompanyHeader({
  store,
  tab,
  onTab,
  onAddWidget,
  onOpenSearch,
  theme,
  onToggleTheme,
  pinned,
  onTogglePin,
}: {
  store: DashboardStore;
  tab: DashTab;
  onTab: (t: DashTab) => void;
  onAddWidget: () => void;
  onOpenSearch: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const { market, companyName, research, refreshMarket, marketLoading } = useDashboardData();
  const profile = market?.profile;
  const metrics = market?.metrics;
  const ticker = profile?.symbol;
  const name = profile?.longName || companyName || "Select a company";
  const verdict = research?.recommendation?.decision?.toUpperCase();

  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(id);
  }, []);

  // Auto-refresh the live quote every 15s so the terminal feels alive without
  // a manual click — pauses while a refresh is already in flight.
  useEffect(() => {
    if (!ticker) return;
    const id = setInterval(() => {
      if (!marketLoading) void refreshMarket();
    }, 15000);
    return () => clearInterval(id);
  }, [ticker, marketLoading, refreshMarket]);

  // Flash the price green/red for a beat whenever it actually changes, so a
  // refreshed quote reads as "live" instead of a silent number swap.
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPrice = useRef<number | null>(null);
  useEffect(() => {
    const price = metrics?.regularMarketPrice;
    if (price == null) return;
    if (prevPrice.current != null && price !== prevPrice.current) {
      setFlash(price > prevPrice.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 700);
      prevPrice.current = price;
      return () => clearTimeout(t);
    }
    prevPrice.current = price;
  }, [metrics?.regularMarketPrice]);

  const change = metrics?.regularMarketChange;
  const changePct = metrics?.regularMarketChangePercent;
  const up = (changePct ?? 0) >= 0;
  const changeColor = up ? "var(--positive)" : "var(--negative)";

  const exportJson = () => {
    const blob = new Blob([store.exportLayout()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "investorai-layout.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      store.importLayout(text);
    };
    input.click();
  };

  const share = async () => {
    const summary = research
      ? `${name} (${ticker ?? ""}) — InvestorAI verdict: ${verdict ?? "—"}. ${research.recommendation.summary}`
      : `${name} (${ticker ?? ""}) on InvestorAI`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="no-print border-b border-border bg-background/80 px-6 pl-14 backdrop-blur-sm lg:pl-6">
      {/* Title row */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyLogo website={profile?.website} seed={ticker || name} size={40} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{name}</h1>
              {ticker && (
                <span className="mono shrink-0 text-sm font-medium text-muted-foreground">
                  {ticker}
                </span>
              )}
              {verdict && (
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold"
                  style={{ color: VERDICT_COLOR[verdict], background: "var(--background-secondary)" }}
                >
                  {verdict}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {profile?.exchange && <Badge variant="outline">{profile.exchange}</Badge>}
              {profile?.sector && <Badge variant="outline">{profile.sector}</Badge>}
              {market?.fetchedAt && (
                <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive" />
                  </span>
                  <span className="hidden sm:inline">Live · updated {relativeTime(market.fetchedAt, now)}</span>
                  <span className="sm:hidden">Live</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <SimpleTooltip label="Search (⌘K)">
            <Button variant="ghost" size="icon-sm" onClick={onOpenSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
          {ticker && (
            <SimpleTooltip label={pinned ? "Remove from watchlist" : "Add to watchlist"}>
              <Button variant="ghost" size="icon-sm" onClick={onTogglePin}>
                <Star className={cn("h-4 w-4", pinned && "fill-warning text-warning")} />
              </Button>
            </SimpleTooltip>
          )}
          <SimpleTooltip label="Refresh market data">
            <Button variant="ghost" size="icon-sm" onClick={() => refreshMarket()} disabled={marketLoading}>
              <RefreshCw className={cn("h-4 w-4", marketLoading && "animate-spin")} />
            </Button>
          </SimpleTooltip>
          <Button variant="outline" size="sm" onClick={share}>
            {copied ? <Check className="h-3.5 w-3.5 text-positive" /> : <Share2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onAddWidget} className="hidden md:inline-flex">
            <Plus className="h-3.5 w-3.5" /> Add Widget
          </Button>
          <Button
            variant={store.editMode ? "default" : "outline"}
            size="sm"
            onClick={() => store.setEditMode(!store.editMode)}
          >
            {store.editMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{store.editMode ? "Done" : "Customize"}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onAddWidget} className="md:hidden">
                <Plus /> Add widget
              </DropdownMenuItem>
              <DropdownMenuLabel>Layout</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => store.saveCurrentAs(`Layout ${store.saved.length + 1}`)}>
                <Save /> Save current layout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={store.resetLayout}>
                <RotateCcw /> Reset to default
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportJson}>
                <Download /> Export layout (JSON)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={importJson}>
                <Upload /> Import layout
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => store.setPresentation(!store.presentation)}>
                <Presentation /> {store.presentation ? "Exit presentation" : "Presentation mode"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer /> Export PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleTheme}>
                {theme === "dark" ? <Sun /> : <Moon />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Live KPI strip */}
      {metrics?.regularMarketPrice != null && (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-background-secondary px-4 py-2.5">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "mono text-2xl font-bold leading-none transition-colors duration-300 rounded px-1 -mx-1",
                flash === "up" && "bg-positive/20 text-positive",
                flash === "down" && "bg-negative/20 text-negative"
              )}
            >
              {fmtMoney(metrics.regularMarketPrice, metrics.currency)}
            </span>
            <span className="mono text-sm font-semibold" style={{ color: changeColor }}>
              {up ? "+" : ""}
              {fmtNum(change)} ({up ? "+" : ""}
              {fmtNum(changePct)}%)
            </span>
          </div>
          <div className="h-7 w-px bg-border" />
          <Kpi label="Mkt Cap" value={fmtCompact(metrics.marketCap, metrics.currency)} />
          <Kpi label="P/E (TTM)" value={fmtNum(metrics.trailingPE)} />
          <Kpi
            label="52W Range"
            value={
              metrics.fiftyTwoWeekLow != null && metrics.fiftyTwoWeekHigh != null
                ? `${fmtMoney(metrics.fiftyTwoWeekLow, metrics.currency)} – ${fmtMoney(metrics.fiftyTwoWeekHigh, metrics.currency)}`
                : "—"
            }
          />
          <Kpi label="Avg Vol" value={fmtCompact(metrics.averageVolume)} />
        </div>
      )}

      {/* Tabs */}
      <div className="mt-3 flex items-center gap-5 overflow-x-auto scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={cn(
              "relative shrink-0 pb-2.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
