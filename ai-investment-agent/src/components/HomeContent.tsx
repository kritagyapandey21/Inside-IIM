"use client";

import { useEffect, useState, useMemo } from "react";
import { DashboardDataProvider, useDashboardData } from "@/lib/dashboard/DashboardContext";
import { useDashboardStore } from "@/lib/dashboard/useDashboardStore";
import { useResearchStore } from "@/lib/useResearchStore";
import Sidebar, { Section } from "@/components/dashboard/Sidebar";
import CompanyHeader, { DashTab } from "@/components/dashboard/CompanyHeader";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import WatchlistView from "@/components/dashboard/WatchlistView";
import CommandPalette from "@/components/CommandPalette";
import { WIDGET_META, ALL_WIDGET_TYPES } from "@/lib/dashboard/widgetMeta";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Cpu,
  Star,
  Briefcase,
  Filter,
  Bell,
  FileText,
  Settings,
  Menu,
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import CompanyLogo from "@/components/CompanyLogo";

/** Detect Mac for keyboard shortcut display. */
const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const shortcutLabel = isMac ? "⌘K" : "Ctrl+K";

/** Quick-pick companies for the landing page. */
const QUICK_PICKS = [
  { name: "NVIDIA", ticker: "NVDA", domain: "nvidia.com" },
  { name: "Apple", ticker: "AAPL", domain: "apple.com" },
  { name: "Tesla", ticker: "TSLA", domain: "tesla.com" },
  { name: "Microsoft", ticker: "MSFT", domain: "microsoft.com" },
  { name: "Amazon", ticker: "AMZN", domain: "amazon.com" },
  { name: "Google", ticker: "GOOG", domain: "google.com" },
  { name: "Meta", ticker: "META", domain: "meta.com" },
  { name: "Netflix", ticker: "NFLX", domain: "netflix.com" },
];

/** Sample symbols for the decorative landing marquee. Intentionally
 *  price-free: a finance product must never scroll stale, fabricated quotes.
 *  Real prices appear only on the live dashboard, sourced from Yahoo. */
const MARQUEE_SYMBOLS = [
  "AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "GOOG", "META", "NFLX",
  "AMD", "AVGO", "JPM", "V", "COST", "ORCL", "ASML", "TSM",
];

/** Placeholder views for sidebar sections that aren't yet built. */
function SectionPlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="section-placeholder">
      <div className="section-placeholder-icon">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm">{description}</p>
      <span className="mt-2 rounded-full bg-hover px-3 py-1 text-xs font-medium">Coming Soon</span>
    </div>
  );
}

const SECTION_VIEWS: Record<Exclude<Section, "dashboard">, { icon: React.ElementType; title: string; description: string }> = {
  watchlist: { icon: Star, title: "Watchlist", description: "Track your favorite companies and get instant updates on price and sentiment changes." },
  portfolio: { icon: Briefcase, title: "Portfolio", description: "Manage your investment portfolio, track P&L, and get AI-powered rebalancing suggestions." },
  screener: { icon: Filter, title: "Stock Screener", description: "Filter the market by fundamentals, technicals, and AI signals to discover opportunities." },
  alerts: { icon: Bell, title: "Smart Alerts", description: "Set custom triggers for price movements, earnings events, and sentiment shifts." },
  reports: { icon: FileText, title: "Research Reports", description: "Generate and export comprehensive PDF research reports for any analyzed company." },
  settings: { icon: Settings, title: "Settings", description: "Configure your API keys, theme preferences, and notification settings." },
};

function DashboardShell() {
  const store = useDashboardStore();
  const researchStore = useResearchStore();
  const { companyName, analyze, marketLoading, researchLoading, loadResearch } = useDashboardData();

  const [section, setSection] = useState<Section>("dashboard");
  const [tab, setTab] = useState<DashTab>("overview");
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Deep-link support: /?q=AAPL (or ?company=) auto-loads a company on first
  // mount, so analyses are shareable via URL. The default section is already
  // "dashboard", so we only need to kick off the analysis.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || params.get("company");
    if (q) analyze(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPinned = useMemo(
    () => companyName ? researchStore.isPinned(companyName) : false,
    [companyName, researchStore]
  );

  // Main content rendering based on sidebar section
  const renderContent = () => {
    if (section === "watchlist") {
      return (
        <div className="flex flex-1 flex-col overflow-hidden">
          <WatchlistView
            watchlist={researchStore.watchlist}
            onOpen={(company) => {
              setSection("dashboard");
              analyze(company);
            }}
            onUnpin={(company) => researchStore.togglePin(company)}
          />
        </div>
      );
    }

    // Other non-dashboard sections show placeholder views
    if (section !== "dashboard") {
      const view = SECTION_VIEWS[section];
      return (
        <div className="flex flex-1 flex-col overflow-hidden">
          <SectionPlaceholder icon={view.icon} title={view.title} description={view.description} />
        </div>
      );
    }

    // Dashboard section: either company analysis or landing page
    if (companyName) {
      return (
        <div className="flex flex-1 flex-col overflow-hidden">
          <CompanyHeader
            store={store}
            tab={tab}
            onTab={setTab}
            onAddWidget={() => setAddWidgetOpen(true)}
            onOpenSearch={() => setPaletteOpen(true)}
            theme={researchStore.theme}
            onToggleTheme={researchStore.toggleTheme}
            pinned={isPinned}
            onTogglePin={() => companyName && researchStore.togglePin(companyName)}
          />
          <div className="flex-1 overflow-y-auto">
            <DashboardGrid store={store} tab={tab} />
          </div>
        </div>
      );
    }

    // Landing page — premium hero
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6">
        {/* Gradient mesh background */}
        <div className="hero-gradient-bg" />

        {/* Decorative, price-free symbol marquee with faded edges */}
        <div className="ticker-viewport absolute inset-x-0 top-8 opacity-30">
          <div className="ticker-tape">
            {[...MARQUEE_SYMBOLS, ...MARQUEE_SYMBOLS].map((sym, i) => (
              <span key={i} className="ticker-item mono text-muted-foreground">
                {sym}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
          {/* Glowing icon */}
          <div className="hero-icon-glow hero-slide-up mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
            <Cpu size={30} className="text-foreground" />
          </div>

          {/* Title */}
          <h2 className="hero-slide-up hero-slide-up-delay-1 mb-3 text-[28px] font-bold leading-tight tracking-tight">
            InvestorAI Terminal
          </h2>

          {/* Subtitle */}
          <p className="hero-slide-up hero-slide-up-delay-2 mb-7 max-w-md text-[13px] leading-relaxed text-muted-foreground">
            Analyze any public company in seconds. An AI-powered INVEST / WATCH / PASS
            verdict, backed by real-time financials, news sentiment, and market data.
          </p>

          {/* Search — minimal, looks like an input, opens the command palette */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hero-slide-up hero-slide-up-delay-3 group flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:border-border-strong hover:bg-hover"
          >
            <Search size={17} className="shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm text-muted-foreground">
              Search a company or ticker…
            </span>
            <kbd className="shrink-0 rounded-md border border-border bg-background-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {shortcutLabel}
            </kbd>
          </button>

          {/* Quick picks */}
          <div className="hero-slide-up hero-slide-up-delay-4 mt-7 flex w-full max-w-md flex-col items-center gap-2.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Quick picks
            </span>
            <div className="flex flex-wrap justify-center gap-1.5">
              {QUICK_PICKS.map((c) => (
                <button
                  key={c.ticker}
                  onClick={() => analyze(c.name)}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-1.5 pr-2.5 text-sm font-medium transition-all hover:border-border-strong hover:bg-hover"
                >
                  <CompanyLogo website={c.domain} seed={c.ticker} size={18} className="rounded-full" />
                  <span className="mono text-[11px] text-muted-foreground group-hover:text-foreground">
                    {c.ticker}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent analyses */}
          {researchStore.history.length > 0 && (
            <div className="hero-slide-up hero-slide-up-delay-4 mt-9 w-full max-w-md text-left">
              <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Recent analyses
              </div>
              <div className="flex flex-col gap-1.5">
                {researchStore.history.slice(0, 4).map((h) => (
                  <button
                    key={h.id}
                    onClick={() => loadResearch(h.result)}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-hover"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        h.result.recommendation.decision === "INVEST"
                          ? "bg-positive"
                          : h.result.recommendation.decision === "PASS"
                          ? "bg-negative"
                          : "bg-warning"
                      }`}
                    />
                    <span className="flex-1 truncate font-medium">{h.result.companyName}</span>
                    <span className="mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {h.result.recommendation.decision}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        section={section}
        onSection={setSection}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Mobile-only menu trigger — sidebar is an overlay drawer below lg */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open menu"
        className="fixed left-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm lg:hidden"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      {renderContent()}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        history={researchStore.history}
        watchlist={researchStore.watchlist}
        onRun={(q) => {
          setSection("dashboard");
          analyze(q);
        }}
        onOpen={(saved) => {
          setSection("dashboard");
          loadResearch(saved.result);
        }}
      />

      <Dialog open={addWidgetOpen} onOpenChange={setAddWidgetOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Widget Gallery</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto p-1">
            {ALL_WIDGET_TYPES.map((type) => {
              const meta = WIDGET_META[type];
              return (
                <div key={type} className="flex flex-col gap-2 rounded-lg border border-border bg-background-secondary p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold">{meta.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => { store.addWidget(type); setAddWidgetOpen(false); }}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                  <div className="mt-2 flex gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span className="rounded bg-hover px-1.5 py-0.5">{meta.source}</span>
                    <span className="rounded bg-hover px-1.5 py-0.5">{meta.w}x{meta.h}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {(marketLoading || researchLoading) && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 rounded-full border border-border bg-popover px-4 py-2 text-sm font-medium shadow-lg fade-in-up">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {marketLoading ? "Fetching market data..." : "AI is analyzing..."}
        </div>
      )}
    </div>
  );
}

export default function HomeContent() {
  return (
    <DashboardDataProvider>
      <TooltipProvider delayDuration={200}>
        <DashboardShell />
      </TooltipProvider>
    </DashboardDataProvider>
  );
}
