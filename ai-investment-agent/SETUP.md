# How to Run It

## Prerequisites

- Node.js 18 or later
- An NVIDIA NIM API key (free) — [build.nvidia.com](https://build.nvidia.com/explore/discover)
- A Tavily Search API key (free tier, 1,000 searches/month) — [app.tavily.com](https://app.tavily.com/)

## Steps

```bash
# 1. Move into the app directory
cd ai-investment-agent

# 2. Install dependencies
npm install

# 3. Create your environment file
```

Create a file named `.env.local` inside `ai-investment-agent/` with the following:

```env
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.1-70b-instruct

TAVILY_API_KEY=your_tavily_api_key_here
```

```bash
# 4. Run the development server
npm run dev

# 5. Open the app
# http://localhost:3000
```

For a production build:

```bash
npm run build
npm run start
```

## Getting the API keys

1. **NVIDIA NIM**: Sign up at [build.nvidia.com](https://build.nvidia.com/explore/discover) and generate a free API key. The default model is `meta/llama-3.1-70b-instruct`, but any OpenAI-compatible NIM model can be swapped in via `NVIDIA_MODEL`.
2. **Tavily**: Sign up at [app.tavily.com](https://app.tavily.com/) for a free API key.

## What to expect on first run

- The market dashboard (price, fundamentals, valuation, ownership) loads in a few seconds — it only talks to Yahoo Finance, no LLM calls.
- The AI research verdict takes longer, typically 1 to 2.5 minutes, because the agent makes roughly eight sequential and parallel LLM calls (company info, financials commentary, news/sentiment, full analysis, final recommendation). A progress indicator shows while this runs.
- Re-running the same company within 15 minutes returns instantly from an in-memory server cache instead of repeating the full analysis.
- If either API key is missing, `/api/research` returns a clear error naming the missing key rather than failing silently.
