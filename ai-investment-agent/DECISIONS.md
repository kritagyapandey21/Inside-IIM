# Key Decisions and Trade-offs

### 1. LangGraph.js over a LangChain agent executor

**Decision**: Built the research pipeline as an explicit `StateGraph` with fixed nodes and edges, instead of an open-ended `AgentExecutor` that decides its own tool sequence.

**Rationale**: A fixed graph is deterministic and debuggable — the same five steps run in the same order every time, which matters for a financial tool where unpredictable agent behavior is a liability. The fan-out/fan-in pattern (three gathering nodes in parallel, then analyze, then recommend) also cuts wall-clock latency versus running everything sequentially.

### 2. NVIDIA NIM over OpenAI

**Decision**: Used NVIDIA's NIM inference platform (Llama 3.1 70B) as the LLM provider.

**Rationale**: NIM exposes an OpenAI-compatible endpoint, so it plugs into `@langchain/openai` with no code changes beyond the base URL — the provider is just an environment variable. It also gives free access to a capable open-weight model, which matters for a take-home project a reviewer needs to run without incurring cost.

**Trade-off accepted**: NIM's free tier rate-limits aggressively, and this agent makes roughly eight LLM calls per analysis. This is handled with retries (see below) rather than reducing the number of calls, because each call has a distinct, narrow job (info, financials commentary, news, analysis, recommendation) and merging them would weaken the quality of each individual output.

### 3. Yahoo Finance (`yahoo-finance2`) over a paid financial data API

**Decision**: Used the free `yahoo-finance2` npm package for all market data instead of a paid provider like Alpha Vantage or Financial Modeling Prep.

**Rationale**: Zero cost, no API key required, and it covers everything the dashboard needs — quotes, multi-year fundamentals, analyst trends, ownership, dividends, and comparables. This also maximizes how easily a reviewer can run the project, since one fewer API key is required.

### 4. Two independent lanes instead of one combined request

**Decision**: Market data (`/api/market`) and the AI verdict (`/api/research`) are separate endpoints, triggered together but resolving independently.

**Rationale**: Market data is cheap and fast (a few seconds, no LLM); the AI verdict is expensive and slow (over a minute, multiple LLM calls). Combining them into one request would mean the dashboard sits blank until the slowest part finishes. Splitting them lets the price chart and fundamentals appear almost immediately while the AI analysis is still running in the background.

### 5. Three-way verdict (INVEST / WATCH / PASS) instead of binary Invest/Pass

**Decision**: The recommendation node outputs one of three decisions, not two.

**Rationale**: A binary choice forces the model to round every ambiguous case to a confident "yes" or "no" it doesn't actually have. WATCH gives it a way to express "promising but not yet" (unresolved risk, stretched valuation) without faking conviction it shouldn't have — closer to how a real analyst would actually leave a name on a watchlist rather than force a premature call.

### 6. Server-side agent execution

**Decision**: The full research pipeline runs in a Next.js API route, never in the browser.

**Rationale**: Keeps the NVIDIA and Tavily API keys off the client entirely, and avoids exposing rate-limit and retry logic to the browser. The trade-off is a longer perceived wait for the AI verdict, mitigated by the fast market lane rendering first and a step-progress indicator for the slower one.

### 7. Strict JSON output for the final recommendation

**Decision**: The recommendation node is prompted to return only a JSON object matching a fixed schema, with markdown code fences stripped defensively in code.

**Rationale**: The dashboard widgets (verdict card, bull/bear thesis, SWOT, moat, risk score) all read specific fields. A structured schema means the frontend can render deterministically instead of parsing free-form prose, at the cost of occasionally needing to strip stray formatting the model adds despite instructions not to.

### 8. In-memory caching and in-flight request de-duplication

**Decision**: Completed research results are cached per company for 15 minutes, and a second request for the same company while one is already running joins the existing run instead of starting a new one.

**Rationale**: A full analysis costs around eight rate-limited LLM calls and over a minute of wall time. Without this, reopening a result from history, a duplicate click, or a shared deep link would each silently re-run the entire pipeline and compete for the same rate limit.

**Left out**: this cache is in-memory and per-server-instance, so it does not survive a restart or scale across multiple instances. A production version would use a shared cache (Redis or similar).

### 9. Client-side persistence only, no backend database or accounts

**Decision**: Research history, the watchlist, the theme, and the dashboard layout are all stored in the browser's `localStorage`. There is no user database, no authentication, and no server-side persistence.

**Rationale**: This is a single-user research tool, not a multi-tenant product, for the scope of this assignment. Adding accounts and a database would be infrastructure the assignment doesn't call for.

**Trade-off accepted**: history and the watchlist are tied to one browser. Clearing browser storage loses them, and they don't sync across devices.

### 10. Deterministic ticker resolution, not an LLM call

**Decision**: Company names and tickers are resolved to a Yahoo symbol using Yahoo's own search endpoint, with a small edit-distance fuzzy match against a curated list of well-known companies as a fallback for typos — not by asking the LLM to guess a ticker.

**Rationale**: This is both faster and free, and it removes one of the eight LLM calls per analysis, which directly eases pressure on NVIDIA NIM's rate limit.

### What was deliberately left out

- **Streaming partial progress**: the UI shows a generic step counter while the AI lane runs, not the literal output of each LangGraph node as it completes. True streaming would improve perceived performance but added meaningful complexity for the assignment's time budget.
- **Automated tests**: there is no test suite for the graph nodes or API routes. Given the time available, manual verification (including real runs against live APIs, see [EXAMPLE_RUNS.md](EXAMPLE_RUNS.md)) was prioritized over test infrastructure.
- **Several dashboard sidebar sections** — Portfolio, Stock Screener, Smart Alerts, Research Reports — exist as navigation entries with a "Coming Soon" placeholder view. They were left as UI shells to show intended product direction without committing time to features outside the core research-agent brief.
