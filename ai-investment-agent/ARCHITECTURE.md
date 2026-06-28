# How It Works

## Two independent data lanes

When a company is analyzed, the frontend kicks off two requests at once. They are independent and render into the dashboard as each one finishes.

### Fast lane: live market data (no LLM)

`GET /api/market?q=<company or ticker>`

1. The query is resolved to a ticker symbol using Yahoo Finance's own search index (`resolveTicker`), not an LLM call. If the query doesn't match anything (for example, a typo like "relience"), a small edit-distance fuzzy match against a curated list of well-known tickers is tried before giving up.
2. Once a ticker is known, a set of independent fetchers run in parallel against `yahoo-finance2`: quote and key statistics, price history, multi-year fundamentals, analyst recommendation trend and upgrade/downgrade history, institutional/insider ownership, dividends and calendar events, and comparable companies.
3. Each fetcher fails independently and returns `null` on error, so one missing data point (for example, a company with no dividend history) never breaks the rest of the dashboard.

This typically resolves in a few seconds and powers all the "market"-sourced widgets (price chart, key metrics, valuation, financial health, comparables, ownership, etc.).

### Slow lane: AI research verdict

`POST /api/research { companyName }`

This runs a LangGraph state graph with five nodes:

```
                 START
                   |
   +---------------+----------------+
   |               |                |
gatherInfo   gatherFinancials   gatherNews      (run in parallel)
   |               |                |
   +---------------+----------------+
                   |
                analyze                          (sequential)
                   |
                recommend                        (sequential)
                   |
                  END
```

- **gatherInfo** — Tavily web search for a business overview, then an LLM call to turn the raw search results into a structured company profile.
- **gatherFinancials** — resolves the ticker (same Yahoo search as above, done independently here so this node has no dependency on the market lane), pulls financial data via a Yahoo Finance tool, and supplements it with a Tavily search for recent earnings and analyst coverage.
- **gatherNews** — two Tavily searches (recent news, and analyst sentiment), summarized by an LLM into headlines, sentiment, risks, and catalysts.
- **analyze** — a single LLM call combines the outputs of all three gathering nodes into a full written report: business quality, financial health, growth prospects, risk assessment, and sentiment/momentum.
- **recommend** — a final LLM call reviews the analysis and returns a strict JSON object: `decision` (`INVEST` / `WATCH` / `PASS`), `confidence`, a 0-100 `score`, a target timeframe, a short summary, bull case, bear case, key metrics, risk level, catalysts, a moat rating, and a SWOT breakdown.

The first three nodes run concurrently (LangGraph fan-out/fan-in), so the wall-clock cost is roughly `max(gatherInfo, gatherFinancials, gatherNews) + analyze + recommend` instead of the sum of all five.

**Reliability**: the agent fires around eight LLM calls per analysis against NVIDIA NIM, which rate-limits aggressively under that load. Every LLM call goes through a retry wrapper with exponential backoff and jitter on `429`/`500`/`503`/`504` responses, so a transient rate limit slows a request down rather than producing a broken "Unable to..." result.

**Caching**: completed results are cached in memory per company name (case-insensitive) for 15 minutes, and concurrent requests for the same company share a single in-flight promise instead of each re-running the full agent. This matters because a full analysis is expensive and the UI can legitimately request the same company more than once (deep links, reopening history, double-clicks).

## Follow-up chat

`POST /api/chat { companyName, question, context }`

A lightweight endpoint for asking follow-up questions about a company that has already been analyzed. It makes a single LLM call with the existing research (analysis, financial data, news) passed in as context, rather than re-running the research graph. The system prompt instructs the model to stay grounded in that context and avoid inventing figures or giving personalized financial advice.

## Autocomplete

`GET /api/search?q=<text>`

Backs the command palette's live suggestions as the user types. Same Yahoo search index as the ticker resolver, with the same fuzzy fallback, returning the full candidate list instead of just the best match.

## Frontend

- **`DashboardContext`** is the single source of truth for both lanes. It exposes `analyze(query)` (kicks off both lanes), `refreshMarket()`, and `loadResearch()` (loads a saved result with no network call). Every fetch is tagged with an incrementing token so a slow, stale response can never overwrite a newer one if the user starts a second search before the first finishes.
- **`DashboardGrid`** renders a curated set of widgets (defined in `widgetMeta.ts`) organized by tab — Overview, Financials, Valuation, Peers, News, Notes. Each widget declares its data source (`market`, `ai`, or `local`) and a default size. Layout, sizing, and any custom saved layouts persist to `localStorage`.
- **`CommandPalette`** (opened with Cmd/Ctrl+K) provides search-as-you-type company resolution, plus quick access to research history and the watchlist.
- **`useResearchStore`** persists research history, the pinned watchlist, and the theme preference to `localStorage`, independent of the dashboard layout store.
- **Deep linking** — visiting `/?q=<company>` (or `?company=`) automatically runs an analysis on load, so a result is shareable by URL.

## Project structure

```
ai-investment-agent/
├── OVERVIEW.md, SETUP.md, ARCHITECTURE.md, DECISIONS.md, EXAMPLE_RUNS.md, IMPROVEMENTS.md
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── research/route.ts  # POST — runs the LangGraph agent
│   │   │   ├── market/route.ts    # GET  — fast-lane Yahoo Finance data
│   │   │   ├── search/route.ts    # GET  — autocomplete for the command palette
│   │   │   └── chat/route.ts      # POST — grounded follow-up Q&A
│   │   ├── page.tsx                # Entry point, loads HomeContent client-side
│   │   └── globals.css
│   ├── components/
│   │   ├── HomeContent.tsx         # Dashboard shell: sidebar, header, grid, palette
│   │   ├── CommandPalette.tsx
│   │   ├── dashboard/              # Sidebar, CompanyHeader, DashboardGrid, WatchlistView
│   │   ├── widgets/                # ~25 widget components (market, AI, and local)
│   │   └── ui/                     # Radix-based primitives (dialog, tabs, tooltip, etc.)
│   └── lib/
│       ├── agent/
│       │   ├── state.ts            # LangGraph state annotations
│       │   ├── tools.ts            # Tavily search + Yahoo Finance financial-data tool
│       │   ├── nodes.ts            # The five graph nodes + LLM retry wrapper
│       │   ├── graph.ts            # StateGraph wiring
│       │   └── marketData.ts       # Ticker resolution + full market-data fetchers
│       ├── dashboard/               # Widget registry, layout store, data context
│       ├── useResearchStore.ts      # History/watchlist/theme persistence
│       └── types.ts
├── .env.local                       # API keys (gitignored, not committed)
├── package.json
└── README.md
```
