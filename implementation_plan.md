# AI Investment Research Agent Implementation Plan

This document outlines the architecture, tech stack, and step-by-step implementation for the AI Investment Research Agent, designed as a comprehensive Next.js application using LangGraph.js.

## Goal Description
Build an end-to-end AI Investment Research Agent that takes a company name as input, autonomously researches real-time financial data, news, and fundamentals, and provides a structured "Invest" or "Pass" recommendation with detailed reasoning. The solution will be built with Next.js (App Router), LangGraph.js, and deployed on Vercel.

## System Architecture

The application will use a Next.js App Router for both the frontend (React/Tailwind) and the backend (API Routes). 

**Agentic Workflow (LangGraph.js):**
1. **Input:** User submits a company name via the frontend.
2. **State Definition:** The agent's state will track `companyName`, `companyInfo`, `financialData`, `newsData`, `analysis`, and `finalRecommendation`.
3. **Nodes (Steps in Graph):**
   - **`gatherInfoNode`**: Uses search tools (e.g., Tavily) to retrieve foundational company information and business models.
   - **`gatherFinancialsNode`**: Uses financial APIs/search tools to extract stock price, market cap, P/E ratio, and recent earnings.
   - **`gatherNewsNode`**: Searches for recent news articles to gauge market sentiment and identify potential risks/tailwinds.
   - **`analyzeNode`**: An LLM synthesizes the gathered data into a cohesive financial analysis report.
   - **`recommendNode`**: An LLM reviews the analysis to make a final, deterministic "Invest" or "Pass" decision, outputting structured JSON with detailed reasoning.
4. **Output:** The structured recommendation is streamed or returned to the Next.js frontend.

## External Integrations
- **LLM:** OpenAI (GPT-4o or GPT-4o-mini) via `@langchain/openai`.
- **Search & News:** Tavily Search API (optimized for LLM agents) via `@langchain/community`.
- **Financial Data:** `yahoo-finance2` (a robust, free npm package for real-time Yahoo Finance data) combined with search.

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   └── research/
│   │       └── route.ts         # API Endpoint triggering the agent
│   ├── page.tsx                 # Main React frontend
│   ├── layout.tsx
│   └── globals.css              # Tailwind CSS
├── components/
│   ├── ResearchForm.tsx         # User input component
│   └── ResultsDisplay.tsx       # Component to render the final recommendation
├── lib/
│   ├── agent/
│   │   ├── graph.ts             # LangGraph state graph definition
│   │   ├── nodes.ts             # Node implementations (Info, News, Financials)
│   │   ├── state.ts             # State interface definition
│   │   └── tools.ts             # External API tools
│   └── utils.ts
```

## User Review Required

> [!IMPORTANT]
> **API Keys Requirement:** To execute this plan, the environment will need an `OPENAI_API_KEY` and a `TAVILY_API_KEY`. I will set up the code to use these from a `.env.local` file. 

> [!NOTE]
> **Tailwind CSS & Styling:** I will use a modern, premium design with Tailwind CSS, utilizing glassmorphism, dynamic gradients, and smooth micro-animations to ensure the frontend is production-ready and visually impressive.

## Open Questions
- Do you have active API keys for OpenAI and Tavily that you would like to use during testing, or should I prepare the code so you can easily plug them in before submission?
- Would you like me to include real-time streaming of the agent's thought process to the UI, or just show a loading state until the final recommendation is ready? (Showing a loading state with progress updates is often cleaner for complex LangGraph workflows).

## Proposed Changes
I will scaffold a new Next.js project and implement the core code.

### Next.js Project Creation
- Run `npx create-next-app` to set up the boilerplate.
- Install dependencies: `@langchain/core`, `@langchain/openai`, `@langchain/langgraph`, `@langchain/community`, `tavily-search`, `yahoo-finance2`, `zod`, `lucide-react`.

### Backend Agent Logic (LangGraph)
#### [NEW] `src/lib/agent/state.ts`
Define the `ResearchState` interface.
#### [NEW] `src/lib/agent/nodes.ts`
Implement the data gathering and analysis logic.
#### [NEW] `src/lib/agent/graph.ts`
Compile the state graph and expose the runnable agent.

### Frontend
#### [NEW] `src/app/page.tsx`
Create the premium, responsive landing page.
#### [NEW] `src/app/api/research/route.ts`
Create the Next.js Route Handler to bridge the frontend and LangGraph backend.

### Documentation
#### [NEW] `README.md`
Write the comprehensive submission documentation (Overview, Architecture, Setup, Trade-offs).

## Verification Plan
1. **Automated Setup:** Verify the project builds successfully (`npm run build`).
2. **Manual Verification:** I will ask you to run the local development server (`npm run dev`), input a test company (e.g., "Apple" or "NVIDIA"), and verify that the agent successfully retrieves data, analyzes it, and displays the "Invest/Pass" recommendation on the UI.
