# API Keys Required

This project will not run without two free API keys: one for **NVIDIA NIM** (the LLM) and one for **Tavily** (web search). Both have free tiers and take a couple of minutes to set up.

## 1. NVIDIA NIM

Used for all AI analysis and the final INVEST/WATCH/PASS recommendation.

1. Go to [build.nvidia.com](https://build.nvidia.com/explore/discover).
2. Sign up or log in.
3. Generate an API key.

## 2. Tavily

Used for web search — company information, news, and sentiment.

1. Go to [app.tavily.com](https://app.tavily.com/).
2. Sign up or log in.
3. Copy your API key from the dashboard (free tier includes 1,000 searches/month).

## Where to put them

Create a file named `.env.local` in this directory (`ai-investment-agent/`) with:

```env
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.1-70b-instruct

TAVILY_API_KEY=your_tavily_api_key_here
```

`.env.local` is gitignored, so your keys are never committed.

Without both keys set, `npm run dev` will still start, but any company search will fail with an error naming the missing key. See [SETUP.md](SETUP.md) for the full run instructions.
