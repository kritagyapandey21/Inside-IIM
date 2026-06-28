import { NextRequest, NextResponse } from "next/server";
import { searchCompanies } from "@/lib/agent/marketData";

// Lightweight ticker/company-name autocomplete — no LLM, just Yahoo's search index.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await searchCompanies(q);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
