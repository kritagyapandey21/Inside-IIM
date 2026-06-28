# What I Would Improve With More Time

1. **Real streaming progress**: replace the generic step-counter loading state with actual per-node progress from the LangGraph run (for example, via LangGraph's streaming API), so the user sees "Gathering financials..." complete and "Analyzing..." begin in real time instead of an estimated timer.

2. **Shared, persistent caching**: the current result cache is in-memory and per-server-instance, so it is lost on restart and does not work across multiple deployed instances. A production version would move this to Redis or a similar shared store.

3. **Server-side history and accounts**: research history, the watchlist, and dashboard layout currently live only in browser `localStorage`. With more time this would move to a real backend with authentication, so a user's research persists across devices.

4. **Comparison mode**: let a user analyze two companies side by side instead of one at a time, reusing the same dashboard widgets in a split view.

5. **Cross-checking the verdict**: run the final recommendation through a second model (or the same model with a different prompt framing) and flag disagreement, rather than trusting a single LLM call for the final INVEST/WATCH/PASS call.

6. **Deeper grounding via RAG**: index SEC filings and earnings call transcripts in a vector database so the analysis node can cite primary sources instead of relying on search-engine summaries and the model's own training knowledge.

7. **Finish the placeholder dashboard sections**: Portfolio tracking, a fundamentals/technicals screener, custom price/sentiment alerts, and exportable PDF research reports currently exist only as "Coming Soon" navigation entries.

8. **Automated tests**: there is currently no test coverage for the LangGraph nodes, the API routes, or the ticker-resolution fuzzy matching. Given more time, this would be the first infrastructure investment before adding further features.

9. **Rate limiting and abuse protection**: before any real deployment, the API routes need request throttling — right now a user could trigger unbounded NVIDIA NIM and Tavily usage.

10. **Dependency cleanup**: `react-grid-layout` is still listed in `package.json` from an earlier version of the dashboard grid that has since been replaced with a deterministic CSS grid; it is no longer imported anywhere and should be removed.
