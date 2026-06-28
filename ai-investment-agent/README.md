# InvestorAI — AI Investment Research Agent

An autonomous AI investment research agent that takes a company name, researches it across the web and live market data, and returns a structured **INVEST / WATCH / PASS** recommendation with full reasoning — inside a dashboard-style research terminal.

Built with **Next.js**, **LangGraph.js**, **NVIDIA NIM**, **Tavily**, and **Yahoo Finance**.

## Documentation

| Section | Description |
|---|---|
| [Overview](OVERVIEW.md) | What the product does and who it's for |
| [How to Run It](SETUP.md) | Setup steps, required API keys, and what to expect |
| [API Keys Required](API_KEYS.md) | Which keys you need and where to get them, free |
| [How It Works](ARCHITECTURE.md) | Architecture, data flow, and project structure |
| [Key Decisions & Trade-offs](DECISIONS.md) | What was chosen, why, and what was left out |
| [Example Runs](EXAMPLE_RUNS.md) | Real agent output on Apple, NVIDIA, and Tesla |
| [What I'd Improve](IMPROVEMENTS.md) | What's next with more time |

## Quick start

```bash
cd ai-investment-agent
npm install
# create .env.local with NVIDIA_API_KEY and TAVILY_API_KEY - see API_KEYS.md
npm run dev
```

Then open `http://localhost:3000`.

## Tech stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 16, React 19 | UI, routing, server components |
| Styling | Tailwind CSS 4 | Dashboard design system |
| Backend | Next.js API routes | Research, market data, search, and chat endpoints |
| Orchestration | LangGraph.js | Multi-step agent state graph |
| LLM | NVIDIA NIM (Llama 3.1 70B) | Analysis and recommendation engine |
| Search | Tavily Search API | Real-time web search for the agent |
| Financial data | yahoo-finance2 | Live quotes, fundamentals, ownership, comparables |
| Charts | Recharts | Price, revenue, and financial health visualizations |
| Language | TypeScript | Type-safe throughout |
| Deployment target | Vercel | Serverless hosting |

## License

Built for educational purposes as part of an AI Product Development assignment.
