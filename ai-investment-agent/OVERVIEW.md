# Overview

InvestorAI is a full-stack AI investment research terminal. You give it a company name or ticker, and it does two things at once:

1. **Instant market dashboard** — live price, fundamentals, valuation, ownership, analyst consensus, and peer comparables, pulled directly from Yahoo Finance. No AI involved, so this appears within a few seconds.
2. **AI research verdict** — an autonomous agent searches the web for company information and news, pulls financial data, then has an LLM synthesize all of it into a written investment analysis and a final structured recommendation: **INVEST**, **WATCH**, or **PASS**, with a confidence level, a 0-100 conviction score, a bull case, a bear case, a SWOT breakdown, a competitive moat rating, a risk level, and upcoming catalysts.

Both results land in a single dashboard-style interface (sidebar, a customizable grid of widgets, a command palette for search, a watchlist, and saved research history) rather than a static report page. A grounded follow-up chat lets you ask questions about a company after the initial analysis completes, without re-running the full research pipeline.

## Who this is for

The product brief was: take a company name, research it, and decide whether to invest or pass, with reasoning. InvestorAI answers that brief directly (the INVEST/WATCH/PASS verdict with reasoning) and wraps it in the kind of terminal-style dashboard an actual research analyst would expect, using the same live market data to ground the AI's qualitative judgment in real numbers.

## What it is not

It is not a brokerage, it does not place trades, and it does not give personalized financial advice. It is a research aid: a faster way to get a first-pass structured opinion on a company, backed by real data, that a user would still sanity-check before acting on.

See [ARCHITECTURE.md](ARCHITECTURE.md) for how it's built, [SETUP.md](SETUP.md) to run it, [EXAMPLE_RUNS.md](EXAMPLE_RUNS.md) for real output, [DECISIONS.md](DECISIONS.md) for what was chosen and why, and [IMPROVEMENTS.md](IMPROVEMENTS.md) for what's next.
