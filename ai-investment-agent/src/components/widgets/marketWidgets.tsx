"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Line,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Percent,
  TrendingUp,
  Building2,
  AreaChart as AreaChartIcon,
  LineChart as LineChartIcon,
  BarChart3,
  CandlestickChart,
} from "lucide-react";
import { useDashboardData } from "@/lib/dashboard/DashboardContext";
import { WidgetLoading, WidgetError, WidgetEmpty } from "./WidgetStates";
import { CHART, Delta, MetricTile, GaugeBar } from "./parts";
import { cn, fmtCompact, fmtMoney, fmtNum, fmtPct } from "@/lib/utils";
import type { MarketData } from "@/lib/types";

/** Shared gate for market-data widgets. */
function MarketGate({ children }: { children: (m: MarketData) => React.ReactNode }) {
  const { market, marketLoading, marketError, refreshMarket } = useDashboardData();
  if (marketLoading && !market) return <WidgetLoading />;
  if (marketError && !market)
    return <WidgetError message={marketError} onRetry={() => refreshMarket()} />;
  if (!market) return <WidgetEmpty label="Run an analysis to load market data" />;
  return <>{children(market)}</>;
}

function ChartTooltip({ active, payload, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      {payload.map((p: any, i: number) => (
        <div key={i} className="mono">
          {formatter ? formatter(p) : `${p.name}: ${p.value}`}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- Price */

const PRICE_RANGES = ["1M", "3M", "6M", "1Y"] as const;
const CHART_TYPES = [
  { id: "area", label: "Area", icon: AreaChartIcon },
  { id: "line", label: "Line", icon: LineChartIcon },
  { id: "candle", label: "Candles", icon: CandlestickChart },
  { id: "bar", label: "OHLC", icon: BarChart3 },
] as const;
type ChartTypeId = (typeof CHART_TYPES)[number]["id"];

function sliceByRange<T extends { date: string }>(points: T[], range: string): T[] {
  if (points.length === 0) return points;
  const last = new Date(points[points.length - 1].date).getTime();
  const days = range === "1M" ? 31 : range === "3M" ? 93 : range === "6M" ? 186 : 372;
  const cutoff = last - days * 24 * 3600 * 1000;
  const sliced = points.filter((p) => new Date(p.date).getTime() >= cutoff);
  return sliced.length > 1 ? sliced : points;
}

/**
 * Custom Recharts shape: a classic OHLC candlestick (wick + body).
 *
 * Driven by a floating bar with dataKey={["low", "high"]} — Recharts then
 * gives this shape pixel-accurate `y` (top, i.e. high) and `height` (high→low
 * span) for free, since that's exactly what a range bar's y/height represent.
 * Open/close only need to be re-projected onto that same pixel span.
 */
function Candle(props: any) {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  if ([open, close, high, low].some((v) => typeof v !== "number")) return null;
  const up = close >= open;
  const color = up ? CHART.positive : CHART.negative;
  const span = Math.max(high - low, 1e-9);
  const pxPerUnit = height / span;
  const yOpen = y + (high - open) * pxPerUnit;
  const yClose = y + (high - close) * pxPerUnit;
  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1);
  const cx = x + width / 2;
  return (
    <g>
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={x} y={bodyTop} width={width} height={bodyHeight} fill={color} />
    </g>
  );
}

export function PriceChart() {
  const [range, setRange] = useState<string>("1Y");
  const [chartType, setChartType] = useState<ChartTypeId>("area");
  return (
    <MarketGate>
      {(m) => {
        const hist = m.priceHistory;
        if (!hist || hist.points.length === 0)
          return <WidgetEmpty label="No price history" />;
        const data = sliceByRange(
          hist.points.map((p) => ({
            date: p.date,
            close: p.close,
            open: p.open,
            high: p.high,
            low: p.low,
            // Recharts floating-bar form: a [min, max] tuple dataKey gives the
            // Candle shape pixel-accurate y/height for the high-low span.
            range: [p.low, p.high] as [number, number],
          })),
          range
        );
        const price = m.metrics.regularMarketPrice;
        const chg = m.metrics.regularMarketChangePercent;
        const up = (chg ?? 0) >= 0;
        const currency = hist.currency ?? m.metrics.currency;
        const ohlcTooltip = (p: any) =>
          `${new Date(p.payload.date).toLocaleDateString()} · O ${fmtMoney(p.payload.open, currency)} H ${fmtMoney(
            p.payload.high,
            currency
          )} L ${fmtMoney(p.payload.low, currency)} C ${fmtMoney(p.payload.close, currency)}`;
        return (
          <div className="flex h-full flex-col">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <span className="mono text-2xl font-bold">{fmtMoney(price, currency)}</span>{" "}
                <Delta value={chg} className="text-sm" />
              </div>
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                {CHART_TYPES.map((ct) => {
                  const Icon = ct.icon;
                  return (
                    <button
                      key={ct.id}
                      onClick={() => setChartType(ct.id)}
                      title={ct.label}
                      aria-label={ct.label}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-[5px] transition-colors",
                        chartType === ct.id
                          ? "bg-hover text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "area" ? (
                  <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={up ? CHART.positive : CHART.negative} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={up ? CHART.positive : CHART.negative} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={["auto", "auto"]} hide />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(p: any) =>
                            `${new Date(p.payload.date).toLocaleDateString()} · ${fmtMoney(p.value, currency)}`
                          }
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke={up ? CHART.positive : CHART.negative}
                      strokeWidth={1.6}
                      fill="url(#priceFill)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                ) : chartType === "line" ? (
                  <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={["auto", "auto"]} hide />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(p: any) =>
                            `${new Date(p.payload.date).toLocaleDateString()} · ${fmtMoney(p.value, currency)}`
                          }
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke={up ? CHART.positive : CHART.negative}
                      strokeWidth={1.6}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                ) : chartType === "candle" ? (
                  <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={["auto", "auto"]} hide />
                    <Tooltip content={<ChartTooltip formatter={ohlcTooltip} />} />
                    <Bar dataKey="range" shape={<Candle />} isAnimationActive={false} />
                  </ComposedChart>
                ) : (
                  <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={["auto", "auto"]} hide />
                    <Tooltip content={<ChartTooltip formatter={ohlcTooltip} />} />
                    <Bar dataKey="close" isAnimationActive={false}>
                      {data.map((d, i) => (
                        <Cell key={i} fill={d.close >= d.open ? CHART.positive : CHART.negative} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-1">
              {PRICE_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                    range === r
                      ? "bg-hover text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        );
      }}
    </MarketGate>
  );
}

export function StockPerformance() {
  return (
    <MarketGate>
      {(m) => {
        const hist = m.priceHistory;
        if (!hist || hist.points.length === 0) return <WidgetEmpty label="No price history" />;
        const data = hist.points.map((p) => ({ date: p.date, close: p.close }));
        const first = data[0].close;
        const last = data[data.length - 1].close;
        const perf = ((last - first) / first) * 100;
        const up = perf >= 0;
        const currency = hist.currency ?? m.metrics.currency;
        return (
          <div className="flex h-full flex-col">
            <div className="mb-2">
              <span className="mono text-xl font-bold">{fmtMoney(last, currency)}</span>{" "}
              <Delta value={perf} className="text-sm" /> <span className="text-xs text-muted-foreground">1Y</span>
            </div>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={up ? CHART.positive : CHART.negative} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={up ? CHART.positive : CHART.negative} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={["auto", "auto"]} hide />
                  <Tooltip content={<ChartTooltip formatter={(p: any) => fmtMoney(p.value, currency)} />} />
                  <Area type="monotone" dataKey="close" stroke={up ? CHART.positive : CHART.negative} strokeWidth={1.6} fill="url(#perfFill)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }}
    </MarketGate>
  );
}

/* ---------------------------------------------------------------- Key Metrics */

export function KeyMetrics() {
  return (
    <MarketGate>
      {(m) => {
        const k = m.metrics;
        return (
          <div className="grid h-full grid-cols-2 content-start gap-2.5">
            <MetricTile label="Market Cap" value={fmtCompact(k.marketCap, k.currency)} icon={<Building2 className="h-3 w-3" />} />
            <MetricTile label="P/E (TTM)" value={fmtNum(k.trailingPE)} icon={<Percent className="h-3 w-3" />} />
            <MetricTile label="Revenue (TTM)" value={fmtCompact(k.totalRevenue, k.currency)} icon={<DollarSign className="h-3 w-3" />} />
            <MetricTile label="ROE" value={fmtPct(k.returnOnEquity)} icon={<TrendingUp className="h-3 w-3" />} />
            <MetricTile label="Profit Margin" value={fmtPct(k.profitMargins)} />
            <MetricTile label="Div Yield" value={fmtPct(k.dividendYield)} />
          </div>
        );
      }}
    </MarketGate>
  );
}

/* ---------------------------------------------------------------- Valuation */

export function Valuation() {
  return (
    <MarketGate>
      {(m) => {
        const k = m.metrics;
        const rows = [
          { label: "P/E (TTM)", value: k.trailingPE, fmt: fmtNum },
          { label: "P/E (Fwd)", value: k.forwardPE, fmt: fmtNum },
          { label: "P/B", value: k.priceToBook, fmt: fmtNum },
          { label: "EV/EBITDA", value: k.enterpriseToEbitda, fmt: fmtNum },
          { label: "EV/Revenue", value: k.enterpriseToRevenue, fmt: fmtNum },
          { label: "Beta", value: k.beta, fmt: fmtNum },
        ].filter((r) => r.value != null);
        const price = k.regularMarketPrice;
        const target = k.targetMeanPrice;
        const upside = price && target ? ((target - price) / price) * 100 : undefined;
        return (
          <div className="flex h-full flex-col gap-3 overflow-auto pb-2 pr-1">
            <div className="grid grid-cols-2 gap-2">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between rounded-md border border-border bg-background-secondary px-2.5 py-1.5">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className="mono text-sm font-medium">{r.fmt(r.value)}</span>
                </div>
              ))}
            </div>
            {target != null && (
              <div className="rounded-lg border border-border bg-background-secondary p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Analyst Target</span>
                  {upside != null && <Delta value={upside} className="text-xs" suffix="% upside" />}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="mono text-lg font-semibold">{fmtMoney(target, k.currency)}</span>
                  <span className="text-xs text-muted-foreground">vs {fmtMoney(price, k.currency)} now</span>
                </div>
              </div>
            )}
          </div>
        );
      }}
    </MarketGate>
  );
}

/* ---------------------------------------------------------------- Revenue Growth */

export function RevenueGrowth() {
  return (
    <MarketGate>
      {(m) => {
        const f = m.fundamentals?.filter((r) => r.revenue != null) ?? [];
        if (f.length === 0) return <WidgetEmpty label="No revenue data" />;
        const currency = m.metrics.currency;
        const data = f.map((r, i) => {
          const prev = i > 0 ? f[i - 1].revenue : undefined;
          const yoy = prev && r.revenue ? ((r.revenue - prev) / prev) * 100 : undefined;
          return { period: r.period, revenue: r.revenue, yoy };
        });
        const latestYoY = data[data.length - 1]?.yoy;
        // Anchor the Y axis just below the smallest bar so year-over-year
        // changes are actually visible — a 0-baseline made $81B vs $97B look
        // nearly identical, which read as "wrong" data. Bars are colored by the
        // direction of their own YoY change so up/down years are honest at a
        // glance.
        const revenues = data.map((d) => d.revenue).filter((v): v is number => v != null);
        const minRev = revenues.length ? Math.min(...revenues) : 0;
        const maxRev = revenues.length ? Math.max(...revenues) : 0;
        const lowerBound = Math.max(0, minRev - (maxRev - minRev) * 0.35);
        return (
          <div className="flex h-full flex-col">
            {latestYoY != null && (
              <div className="mb-1">
                <Delta value={latestYoY} className="text-xl font-bold" />{" "}
                <span className="text-xs text-muted-foreground">YoY growth</span>
              </div>
            )}
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="period" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[lowerBound, "auto"]} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(p: any) =>
                          `${p.payload.period}: ${fmtCompact(p.value, currency)}${
                            p.payload.yoy != null
                              ? ` (${p.payload.yoy >= 0 ? "+" : ""}${p.payload.yoy.toFixed(1)}% YoY)`
                              : ""
                          }`
                        }
                      />
                    }
                    cursor={{ fill: "var(--hover)" }}
                  />
                  <Bar dataKey="revenue" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {data.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.yoy != null && d.yoy < 0 ? CHART.negative : CHART.positive}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }}
    </MarketGate>
  );
}

/* ---------------------------------------------------------------- Financial Health */

export function FinancialHealth() {
  return (
    <MarketGate>
      {(m) => {
        const k = m.metrics;
        const gauges: { label: string; pct: number; display: string; tone: any }[] = [];
        if (k.grossMargins != null) gauges.push({ label: "Gross Margin", pct: k.grossMargins * 100, display: fmtPct(k.grossMargins), tone: "positive" });
        if (k.operatingMargins != null) gauges.push({ label: "Operating Margin", pct: k.operatingMargins * 100, display: fmtPct(k.operatingMargins), tone: "positive" });
        if (k.profitMargins != null) gauges.push({ label: "Net Margin", pct: k.profitMargins * 100, display: fmtPct(k.profitMargins), tone: "positive" });
        if (k.currentRatio != null) gauges.push({ label: "Current Ratio", pct: Math.min(100, (k.currentRatio / 3) * 100), display: fmtNum(k.currentRatio) + "x", tone: k.currentRatio >= 1 ? "positive" : "negative" });
        if (k.debtToEquity != null) gauges.push({ label: "Debt / Equity", pct: Math.min(100, (k.debtToEquity / 200) * 100), display: fmtNum(k.debtToEquity), tone: k.debtToEquity > 150 ? "negative" : k.debtToEquity > 80 ? "warning" : "positive" });
        if (k.returnOnEquity != null) gauges.push({ label: "ROE", pct: Math.min(100, k.returnOnEquity * 100), display: fmtPct(k.returnOnEquity), tone: "positive" });
        if (gauges.length === 0) return <WidgetEmpty label="No financial health data" />;
        return (
          <div className="flex h-full flex-col justify-center gap-2.5 overflow-auto pb-2 pr-1">
            {gauges.map((g) => (
              <GaugeBar key={g.label} {...g} />
            ))}
          </div>
        );
      }}
    </MarketGate>
  );
}

/* ---------------------------------------------------------------- Business Health radar (derived from real metrics) */

export function BusinessHealth() {
  return (
    <MarketGate>
      {(m) => {
        const k = m.metrics;
        // Each axis 0-100, scaled from real Yahoo figures.
        const clamp = (n: number) => Math.max(5, Math.min(100, n));
        const axes = [
          { axis: "Profitability", v: k.profitMargins != null ? clamp(k.profitMargins * 300) : null },
          { axis: "Growth", v: k.revenueGrowth != null ? clamp(50 + k.revenueGrowth * 200) : null },
          { axis: "Efficiency", v: k.returnOnEquity != null ? clamp(k.returnOnEquity * 200) : null },
          { axis: "Financials", v: k.currentRatio != null ? clamp(k.currentRatio * 40) : null },
          { axis: "Margins", v: k.operatingMargins != null ? clamp(k.operatingMargins * 300) : null },
        ].filter((a) => a.v != null) as { axis: string; v: number }[];
        if (axes.length < 3) return <WidgetEmpty label="Insufficient data for radar" />;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={axes} outerRadius="72%">
              <PolarGrid stroke={CHART.grid} />
              <PolarAngleAxis dataKey="axis" tick={{ fill: CHART.axis, fontSize: 10 }} />
              <Radar dataKey="v" stroke={CHART.positive} fill={CHART.positive} fillOpacity={0.25} isAnimationActive={false} />
              <Tooltip content={<ChartTooltip formatter={(p: any) => `${p.payload.axis}: ${Math.round(p.value)}/100`} />} />
            </RadarChart>
          </ResponsiveContainer>
        );
      }}
    </MarketGate>
  );
}

/* ---------------------------------------------------------------- Key Financials table */

export function KeyFinancials() {
  return (
    <MarketGate>
      {(m) => {
        const f = m.fundamentals ?? [];
        if (f.length === 0) return <WidgetEmpty label="No financial statements" />;
        const currency = m.metrics.currency;
        const rows: { label: string; get: (r: (typeof f)[number]) => string }[] = [
          { label: "Revenue", get: (r) => fmtCompact(r.revenue, currency) },
          { label: "Gross Margin", get: (r) => fmtPct(r.grossMargin) },
          { label: "Operating Margin", get: (r) => fmtPct(r.operatingMargin) },
          { label: "Net Income", get: (r) => fmtCompact(r.netIncome, currency) },
          { label: "Net Margin", get: (r) => fmtPct(r.netMargin) },
          { label: "EPS (Diluted)", get: (r) => fmtMoney(r.eps, currency) },
          { label: "Free Cash Flow", get: (r) => fmtCompact(r.freeCashFlow, currency) },
        ];
        return (
          <div className="h-full overflow-auto pb-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-2 text-left font-medium">Metric</th>
                  {f.map((r, i) => (
                    <th
                      key={r.period}
                      className={cn("py-2 pl-2 text-right font-medium", i === f.length - 1 && "pr-1")}
                    >
                      {r.period}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr
                    key={row.label}
                    className={cn(ri !== rows.length - 1 && "border-b border-border/60")}
                  >
                    <td className="py-2 pr-2 text-left text-muted-foreground">{row.label}</td>
                    {f.map((r, i) => (
                      <td
                        key={r.period}
                        className={cn("mono py-2 pl-2 text-right", i === f.length - 1 && "pr-1")}
                      >
                        {row.get(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }}
    </MarketGate>
  );
}

/* ---------------------------------------------------------------- Analyst Consensus */

export function AnalystConsensus() {
  return (
    <MarketGate>
      {(m) => {
        const trend = m.analystTrend?.[0];
        const k = m.metrics;
        if (!trend) return <WidgetEmpty label="No analyst coverage" />;
        const segments = [
          { label: "Strong Buy", value: trend.strongBuy, color: "#16a34a" },
          { label: "Buy", value: trend.buy, color: "#22c55e" },
          { label: "Hold", value: trend.hold, color: "#f59e0b" },
          { label: "Sell", value: trend.sell, color: "#f97316" },
          { label: "Strong Sell", value: trend.strongSell, color: "#ef4444" },
        ];
        const total = segments.reduce((s, x) => s + x.value, 0) || 1;
        return (
          <div className="flex h-full flex-col gap-3">
            <div className="flex h-7 overflow-hidden rounded-md">
              {segments.map((s) =>
                s.value > 0 ? (
                  <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${s.value}`} />
                ) : null
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {segments.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="mono">{s.value}</span>
                </div>
              ))}
            </div>
            {k.targetMeanPrice != null && (
              <div className="mt-auto flex items-center justify-between rounded-md border border-border bg-background-secondary px-3 py-2 text-sm">
                <span className="text-muted-foreground">Mean Target</span>
                <span className="mono font-semibold">{fmtMoney(k.targetMeanPrice, k.currency)}</span>
              </div>
            )}
          </div>
        );
      }}
    </MarketGate>
  );
}

/* ---------------------------------------------------------------- Institutional Ownership */

export function InstitutionalOwnership() {
  return (
    <MarketGate>
      {(m) => {
        const o = m.ownership;
        const holders = m.institutions ?? [];
        if (!o && holders.length === 0) return <WidgetEmpty label="No ownership data" />;
        return (
          <div className="flex h-full flex-col gap-3 overflow-auto pb-2 pr-1">
            {o && (
              <div className="grid grid-cols-2 gap-2">
                <MetricTile label="Institutions" value={fmtPct(o.institutionsPercentHeld)} />
                <MetricTile label="Insiders" value={fmtPct(o.insidersPercentHeld)} />
              </div>
            )}
            {holders.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Top Holders</div>
                <div className="flex flex-col gap-1">
                  {holders.slice(0, 6).map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate text-foreground/90">{h.name}</span>
                      <span className="mono shrink-0 text-xs text-muted-foreground">{fmtPct(h.pctHeld)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }}
    </MarketGate>
  );
}

/* ---------------------------------------------------------------- Insider Activity */

export function InsiderActivity() {
  return (
    <MarketGate>
      {(m) => {
        const txns = m.insiders ?? [];
        const currency = m.metrics.currency;
        if (txns.length === 0) return <WidgetEmpty label="No insider transactions" />;
        return (
          <div className="h-full overflow-auto pb-2 pr-1">
            <div className="flex flex-col gap-1.5">
              {txns.slice(0, 12).map((t, i) => {
                const isBuy = /buy|purchase|acqui/i.test(t.transaction ?? "");
                const isSell = /sale|sell|disposed/i.test(t.transaction ?? "");
                return (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground/90">{t.name}</div>
                      <div className="truncate text-muted-foreground">{t.relation}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {isBuy ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-positive" />
                      ) : isSell ? (
                        <ArrowDownRight className="h-3.5 w-3.5 text-negative" />
                      ) : null}
                      <span className="mono">{fmtCompact(t.value, currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }}
    </MarketGate>
  );
}

/* ---------------------------------------------------------------- Comparables */

export function Comparables() {
  return (
    <MarketGate>
      {(m) => {
        const c = m.comparables ?? [];
        if (c.length === 0) return <WidgetEmpty label="No comparable companies" />;
        return (
          <div className="h-full overflow-auto pb-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-2 text-left font-medium">Symbol</th>
                  <th className="px-2 py-2 text-right font-medium">Price</th>
                  <th className="px-2 py-2 text-right font-medium">Chg</th>
                  <th className="px-2 py-2 text-right font-medium">Mkt Cap</th>
                  <th className="py-2 pl-2 pr-1 text-right font-medium">P/E</th>
                </tr>
              </thead>
              <tbody>
                {c.map((row) => (
                  <tr key={row.symbol} className="border-b border-border/60">
                    <td className="py-2 pr-2 text-left font-medium">{row.symbol}</td>
                    <td className="mono px-2 py-2 text-right">{fmtMoney(row.price, row.currency)}</td>
                    <td className="px-2 py-2 text-right">
                      <span className={(row.changePercent ?? 0) >= 0 ? "text-positive" : "text-negative"}>
                        {row.changePercent != null ? `${row.changePercent >= 0 ? "+" : ""}${row.changePercent.toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td className="mono px-2 py-2 text-right">{fmtCompact(row.marketCap, row.currency)}</td>
                    <td className="mono py-2 pl-2 pr-1 text-right">{fmtNum(row.trailingPE)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }}
    </MarketGate>
  );
}

/* ---------------------------------------------------------------- Dividends */

export function Dividends() {
  return (
    <MarketGate>
      {(m) => {
        const d = m.dividends ?? [];
        if (d.length === 0) return <WidgetEmpty label="No dividend history (or non-dividend payer)" />;
        const byYear = groupDividends(d);
        const currency = m.metrics.currency;
        return (
          <div className="flex h-full flex-col">
            <div className="mb-1 text-xs text-muted-foreground">
              Annual dividends per share
            </div>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byYear} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="year" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<ChartTooltip formatter={(p: any) => `${p.payload.year}: ${fmtMoney(p.value, currency)}`} />} cursor={{ fill: "var(--hover)" }} />
                  <Bar dataKey="amount" radius={[3, 3, 0, 0]} fill={CHART.positive} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }}
    </MarketGate>
  );
}

function groupDividends(d: { date: string; amount: number }[]) {
  const map = new Map<string, number>();
  for (const x of d) {
    const y = new Date(x.date).getFullYear().toString();
    map.set(y, (map.get(y) ?? 0) + x.amount);
  }
  return Array.from(map.entries())
    .map(([year, amount]) => ({ year, amount }))
    .sort((a, b) => a.year.localeCompare(b.year));
}
