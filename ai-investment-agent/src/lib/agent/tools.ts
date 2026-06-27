import { TavilySearch } from "@langchain/tavily";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Tavily Search Tool — optimized for LLM agents.
 * Retrieves concise, relevant web search results.
 */
export function createSearchTool() {
  return new TavilySearch({
    maxResults: 5,
  });
}

/**
 * Financial Data Tool — fetches stock data from Yahoo Finance
 * via the yahoo-finance2 library.
 */
export const fetchFinancialData = tool(
  async ({ ticker }: { ticker: string }) => {
    try {
      // Dynamic import to avoid bundling issues. yahoo-finance2 v3 exports the
      // YahooFinance class as default — it must be instantiated before use.
      const yahooFinance = await import("yahoo-finance2");
      const YahooFinance = yahooFinance.default;
      const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

      // Fetch quote summary — cast to any due to complex union types in yahoo-finance2
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote: any = await yf.quote(ticker);

      // Fetch key statistics if available
      let summary: Record<string, unknown> = {};
      try {
        const result = await yf.quoteSummary(ticker, {
          modules: [
            "financialData",
            "defaultKeyStatistics",
            "earningsTrend",
          ],
        });
        summary = result as Record<string, unknown>;
      } catch {
        // Some modules may not be available for all tickers
      }

      const financialData = {
        symbol: quote.symbol,
        shortName: quote.shortName,
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketChange: quote.regularMarketChange,
        regularMarketChangePercent: quote.regularMarketChangePercent,
        marketCap: quote.marketCap,
        trailingPE: quote.trailingPE,
        forwardPE: quote.forwardPE,
        dividendYield: quote.dividendYield,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        averageVolume: quote.averageVolume,
        ...(summary.financialData
          ? {
              totalRevenue: (summary.financialData as Record<string, unknown>)
                .totalRevenue,
              revenueGrowth: (summary.financialData as Record<string, unknown>)
                .revenueGrowth,
              profitMargins: (summary.financialData as Record<string, unknown>)
                .profitMargins,
              operatingMargins: (
                summary.financialData as Record<string, unknown>
              ).operatingMargins,
              returnOnEquity: (
                summary.financialData as Record<string, unknown>
              ).returnOnEquity,
              debtToEquity: (summary.financialData as Record<string, unknown>)
                .debtToEquity,
              freeCashflow: (summary.financialData as Record<string, unknown>)
                .freeCashflow,
              targetMeanPrice: (
                summary.financialData as Record<string, unknown>
              ).targetMeanPrice,
              recommendationKey: (
                summary.financialData as Record<string, unknown>
              ).recommendationKey,
            }
          : {}),
        ...(summary.defaultKeyStatistics
          ? {
              beta: (
                summary.defaultKeyStatistics as Record<string, unknown>
              ).beta,
              priceToBook: (
                summary.defaultKeyStatistics as Record<string, unknown>
              ).priceToBook,
              enterpriseToEbitda: (
                summary.defaultKeyStatistics as Record<string, unknown>
              ).enterpriseToEbitda,
            }
          : {}),
      };

      return JSON.stringify(financialData, null, 2);
    } catch (error) {
      return `Error fetching financial data for ${ticker}: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: "fetch_financial_data",
    description:
      "Fetches real-time stock quote and financial data for a given ticker symbol from Yahoo Finance. Returns price, market cap, P/E ratio, revenue, margins, and other key metrics.",
    schema: z.object({
      ticker: z.string().describe("The stock ticker symbol, e.g. AAPL, NVDA, MSFT"),
    }),
  }
);
