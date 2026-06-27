import { NextRequest, NextResponse } from "next/server";
import { resolveTicker, getMarketData } from "@/lib/agent/marketData";

// Fast lane: real Yahoo market data, no LLM. Usually returns in a few seconds.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryRaw = searchParams.get("ticker") || searchParams.get("q") || "";
  const range = searchParams.get("range") || "1Y";
  const query = queryRaw.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing ticker/q parameter." }, { status: 400 });
  }

  try {
    // Accept a raw ticker OR a company name; Yahoo search resolves both.
    const ticker = await resolveTicker(query);

    if (!ticker) {
      return NextResponse.json(
        {
          error: `We couldn't find a company matching "${query}". Check the spelling or try a ticker symbol (e.g. AAPL).`,
        },
        { status: 404 }
      );
    }

    const data = await getMarketData(ticker, range);
    return NextResponse.json({ success: true, ticker, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Market data is temporarily unavailable. ${msg}` },
      { status: 500 }
    );
  }
}
