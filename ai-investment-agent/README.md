# 🧠 InvestorAI — AI Investment Research Agent

An autonomous AI-powered investment research agent that takes a company name as input, performs multi-source real-time research, and delivers a structured **Invest** or **Pass** recommendation with detailed reasoning.

Built with **Next.js 15**, **LangGraph.js**, **NVIDIA NIM**, and **Yahoo Finance**.

---

## 📋 Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Key Decisions & Trade-offs](#key-decisions--trade-offs)
- [Future Improvements](#future-improvements)
- [Project Structure](#project-structure)

---

## Overview

InvestorAI is a full-stack application demonstrating advanced **LLM orchestration** using **LangGraph.js**. The system models the investment research process as a directed acyclic graph (DAG), where specialized nodes gather data in parallel, an analysis node synthesizes findings, and a recommendation node produces a final verdict.

### Key Features

- 🔍 **Real-time Data**: Fetches live stock prices, financial ratios, and market data from Yahoo Finance.
- 📰 **News & Sentiment Analysis**: Uses Tavily Search to gather recent news and analyst sentiment.
- 🧠 **AI-Powered Synthesis**: NVIDIA NIM LLM synthesizes raw data into a professional investment thesis.
- ✅ **Structured Output**: Delivers a clear INVEST/PASS decision with bull/bear cases, key metrics, risk levels, and upcoming catalysts.
- ⚡ **Parallel Execution**: Data-gathering nodes run concurrently for optimized latency via LangGraph fan-out/fan-in.
- 🎨 **Premium UI**: Dark-mode glassmorphism design with micro-animations and responsive layout.

---

## How It Works

The agent follows a **5-step autonomous workflow**, orchestrated by LangGraph.js as a state graph:

```
User Input (Company Name)
        │
        ▼
┌───────────────────────────────────────┐
│         PARALLEL DATA GATHERING       │
│                                       │
│  ┌─────────┐ ┌──────────┐ ┌───────┐  │
│  │ Company  │ │Financial │ │ News  │  │
│  │  Info    │ │  Data    │ │Senti- │  │
│  │ (Tavily) │ │ (Yahoo)  │ │ment   │  │
│  └────┬────┘ └────┬─────┘ └───┬───┘  │
│       │           │           │       │
└───────┼───────────┼───────────┼───────┘
        │           │           │
        ▼           ▼           ▼
┌───────────────────────────────────────┐
│         AI ANALYSIS & SYNTHESIS       │
│    (NVIDIA NIM — Llama 3.1 70B)      │
│                                       │
│  • Executive Summary                  │
│  • Financial Health Assessment        │
│  • Growth Prospects                   │
│  • Risk Evaluation                    │
│  • Competitive Analysis               │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│       RECOMMENDATION ENGINE           │
│                                       │
│  Output: Structured JSON              │
│  • Decision: INVEST / PASS            │
│  • Confidence: HIGH / MEDIUM / LOW    │
│  • Bull Case & Bear Case              │
│  • Key Metrics & Risk Level           │
│  • Upcoming Catalysts                 │
└───────────────────────────────────────┘
```

### Step-by-Step:

1. **Company Information Gathering** — Tavily Search retrieves business overview, competitive position, and recent developments.
2. **Financial Data Fetching** — The agent resolves the stock ticker using the LLM, then pulls real-time data from Yahoo Finance (price, market cap, P/E, margins, cash flow). Supplemented with search results for recent earnings.
3. **News & Sentiment Analysis** — Tavily Search retrieves latest news articles and analyst opinions. The LLM summarizes sentiment (bullish/bearish/neutral) and identifies key risks and catalysts.
4. **Comprehensive Analysis** — All gathered data is fed into the LLM to produce a structured investment analysis covering business quality, financial health, growth prospects, and risk assessment.
5. **Final Recommendation** — A separate LLM call reviews the analysis and produces a deterministic INVEST or PASS decision as structured JSON.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                    FRONTEND                       │
│               (Next.js React App)                 │
│                                                   │
│  ┌──────────────┐    ┌────────────────────────┐   │
│  │ ResearchForm │───▶│   ResultsDisplay       │   │
│  │  (Input)     │    │   (Recommendation +    │   │
│  └──────────────┘    │    Analysis Cards)     │   │
│                      └────────────────────────┘   │
└───────────────────────┬──────────────────────────┘
                        │ POST /api/research
                        ▼
┌──────────────────────────────────────────────────┐
│                   BACKEND                         │
│            (Next.js API Route)                    │
│                                                   │
│  ┌────────────────────────────────────────────┐   │
│  │          LangGraph State Graph              │   │
│  │                                            │   │
│  │  State: { companyName, companyInfo,         │   │
│  │          financialData, newsData,           │   │
│  │          analysis, recommendation }         │   │
│  │                                            │   │
│  │  Nodes: gatherInfo, gatherFinancials,       │   │
│  │         gatherNews, analyze, recommend      │   │
│  └────────────────────────────────────────────┘   │
│                                                   │
│  External Services:                               │
│  • NVIDIA NIM API (LLM)                          │
│  • Tavily Search (Web Search)                     │
│  • Yahoo Finance (Financial Data)                 │
└──────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer          | Technology                          | Purpose                              |
|----------------|-------------------------------------|--------------------------------------|
| Frontend       | Next.js 15, React 19, CSS          | UI, routing, server components       |
| Styling        | Custom CSS + Tailwind               | Premium dark-mode design system      |
| Backend        | Next.js API Routes                  | REST endpoint for agent invocation   |
| Orchestration  | **LangGraph.js**                    | Multi-step agent state graph         |
| LLM            | **NVIDIA NIM** (Llama 3.1 70B)     | Analysis & recommendation engine     |
| Search         | **Tavily Search API**               | Real-time web search for agents      |
| Financial Data | **yahoo-finance2**                  | Live stock quotes & fundamentals     |
| Language       | TypeScript                          | Type-safe development                |
| Deployment     | Vercel                              | Serverless deployment target         |

---

## Getting Started

### Prerequisites

- Node.js 18+ installed
- NVIDIA NIM API key ([Get one free](https://build.nvidia.com/explore/discover))
- Tavily Search API key ([Get one free](https://app.tavily.com/))

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd ai-investment-agent

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your API keys

# 4. Run the development server
npm run dev

# 5. Open http://localhost:3000
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# NVIDIA NIM API
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.1-70b-instruct

# Tavily Search API
TAVILY_API_KEY=your_tavily_api_key_here
```

### Getting API Keys

1. **NVIDIA NIM**: Visit [build.nvidia.com](https://build.nvidia.com/explore/discover), sign up, and generate a free API key. Supports models like Llama 3.1 70B, Mixtral, and more.
2. **Tavily**: Visit [tavily.com](https://app.tavily.com/), sign up for a free tier (1,000 searches/month).

---

## Key Decisions & Trade-offs

### 1. LangGraph.js over LangChain Agents
**Decision**: Used LangGraph's `StateGraph` with explicit nodes and edges instead of LangChain's `AgentExecutor`.

**Rationale**: LangGraph provides deterministic control flow, making the agent's behavior predictable and debuggable. The fan-out/fan-in pattern enables parallel data gathering, reducing total latency by ~3x compared to sequential execution. This is a core CS principle — DAG-based execution mirrors real-world data pipeline architectures.

### 2. NVIDIA NIM over OpenAI
**Decision**: Integrated NVIDIA's NIM inference platform instead of OpenAI.

**Rationale**: NVIDIA NIM provides access to open-source models (Llama 3.1) with enterprise-grade inference. The API is OpenAI-compatible, making integration seamless via `@langchain/openai`. This also demonstrates infrastructure flexibility — the code can switch providers by changing environment variables.

### 3. Yahoo Finance (npm) over Paid APIs
**Decision**: Used the `yahoo-finance2` npm package for financial data instead of Alpha Vantage or Financial Modeling Prep.

**Rationale**: Zero-cost, no API key required, and provides comprehensive real-time data (quotes, financials, key statistics). This maximizes accessibility for reviewers evaluating the project. The Tavily search supplements with qualitative data (earnings reports, analyst opinions).

### 4. Server-Side Agent Execution
**Decision**: Agent runs entirely on the server (API route), not in the browser.

**Rationale**: Protects API keys, enables heavier compute, and follows security best practices. The trade-off is longer perceived wait times, mitigated by the animated step-progress loading UI.

### 5. Structured JSON Output
**Decision**: The recommendation node outputs a strict JSON schema rather than free-form text.

**Rationale**: Enables deterministic UI rendering. The frontend can reliably extract `decision`, `bullCase`, `bearCase`, `keyMetrics`, etc., without fragile text parsing. This is enforced via the system prompt — a pattern commonly used in production LLM applications.

---

## Future Improvements

1. **Streaming Responses**: Implement LangGraph streaming to show real-time agent progress and partial results as each node completes.
2. **Historical Analysis**: Add time-series chart visualization using a charting library (e.g., Recharts) to display stock price trends.
3. **Comparison Mode**: Allow users to compare two companies side-by-side.
4. **Persistent Memory**: Use LangGraph checkpointing to cache previous research, reducing redundant API calls.
5. **Multi-Model Voting**: Run analysis through multiple LLMs and aggregate recommendations for higher confidence.
6. **RAG Integration**: Add a vector database (Pinecone/Chroma) to index SEC filings and earnings call transcripts for deeper fundamental analysis.
7. **Authentication & Rate Limiting**: Add user auth and rate limiting for production deployment.
8. **Custom Portfolio Tracking**: Allow users to save companies and track recommendation changes over time.

---

## Project Structure

```
ai-investment-agent/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── research/
│   │   │       └── route.ts          # API endpoint — agent orchestration
│   │   ├── globals.css               # Design system (CSS custom properties)
│   │   ├── layout.tsx                # Root layout with SEO metadata
│   │   └── page.tsx                  # Main page component
│   ├── components/
│   │   ├── ResearchForm.tsx          # Search input + example chips
│   │   └── ResultsDisplay.tsx        # Recommendation + analysis cards
│   └── lib/
│       └── agent/
│           ├── state.ts              # LangGraph state annotations
│           ├── tools.ts              # Tavily Search + Yahoo Finance tools
│           ├── nodes.ts              # 5 graph nodes (gather, analyze, recommend)
│           └── graph.ts              # StateGraph compilation
├── .env.example                      # Environment variable template
├── .env.local                        # Your API keys (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

---

## License

This project is built for educational purposes as part of an AI Product Development assignment.

---

<p align="center">
  Built with ❤️ using Next.js, LangGraph.js & NVIDIA NIM
</p>
