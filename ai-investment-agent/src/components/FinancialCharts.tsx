"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { BarChart3, Scale } from "lucide-react";
import type { FinancialMetrics } from "@/lib/types";

const GREEN = "#22c55e";
const RED = "#ef4444";
const AMBER = "#f59e0b";
const INDIGO = "#818cf8";

const fmtPct = (n?: number) =>
  n === undefined || n === null ? "—" : `${(n * 100).toFixed(1)}%`;
const fmtNum = (n?: number) =>
  n === undefined || n === null ? "—" : n.toFixed(1);
const fmtMoney = (n?: number) =>
  n === undefined || n === null
    ? "—"
    : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

interface ChartTooltipPayload {
  payload: { label: string; display: string };
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ChartTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{p.label}</span>
      <span className="chart-tooltip-value">{p.display}</span>
    </div>
  );
}

/** Horizontal bar block with mono value labels. */
function MetricBars({
  title,
  data,
}: {
  title: string;
  data: { label: string; value: number; display: string; color: string }[];
}) {
  if (data.length === 0) return null;
  return (
    <div className="chart-block">
      <h4 className="chart-block-title">{title}</h4>
      <ResponsiveContainer width="100%" height={data.length * 44 + 10}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          barCategoryGap="28%"
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={108}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={<ChartTooltip />}
          />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function FinancialCharts({
  metrics,
  bullCount,
  bearCount,
}: {
  metrics?: FinancialMetrics | null;
  bullCount: number;
  bearCount: number;
}) {
  // Valuation: P/E trailing vs forward, price vs analyst target.
  const valuation: {
    label: string;
    value: number;
    display: string;
    color: string;
  }[] = [];
  if (metrics?.trailingPE)
    valuation.push({
      label: "P/E (TTM)",
      value: metrics.trailingPE,
      display: fmtNum(metrics.trailingPE),
      color: INDIGO,
    });
  if (metrics?.forwardPE)
    valuation.push({
      label: "P/E (Fwd)",
      value: metrics.forwardPE,
      display: fmtNum(metrics.forwardPE),
      color: AMBER,
    });
  if (metrics?.regularMarketPrice)
    valuation.push({
      label: "Price",
      value: metrics.regularMarketPrice,
      display: fmtMoney(metrics.regularMarketPrice),
      color: INDIGO,
    });
  if (metrics?.targetMeanPrice)
    valuation.push({
      label: "Target",
      value: metrics.targetMeanPrice,
      display: fmtMoney(metrics.targetMeanPrice),
      color:
        metrics.regularMarketPrice &&
        metrics.targetMeanPrice >= metrics.regularMarketPrice
          ? GREEN
          : RED,
    });

  // Profitability: margins + ROE (% values).
  const profitability: {
    label: string;
    value: number;
    display: string;
    color: string;
  }[] = [];
  if (metrics?.profitMargins !== undefined && metrics?.profitMargins !== null)
    profitability.push({
      label: "Profit Margin",
      value: metrics.profitMargins * 100,
      display: fmtPct(metrics.profitMargins),
      color: metrics.profitMargins >= 0 ? GREEN : RED,
    });
  if (
    metrics?.operatingMargins !== undefined &&
    metrics?.operatingMargins !== null
  )
    profitability.push({
      label: "Op. Margin",
      value: metrics.operatingMargins * 100,
      display: fmtPct(metrics.operatingMargins),
      color: metrics.operatingMargins >= 0 ? GREEN : RED,
    });
  if (
    metrics?.returnOnEquity !== undefined &&
    metrics?.returnOnEquity !== null
  )
    profitability.push({
      label: "ROE",
      value: metrics.returnOnEquity * 100,
      display: fmtPct(metrics.returnOnEquity),
      color: metrics.returnOnEquity >= 0 ? GREEN : RED,
    });

  // Bull/bear balance is always available (derived from the recommendation).
  const total = bullCount + bearCount;
  const bullPct = total > 0 ? Math.round((bullCount / total) * 100) : 50;
  const bearPct = 100 - bullPct;

  // 52-week range position.
  const lo = metrics?.fiftyTwoWeekLow;
  const hi = metrics?.fiftyTwoWeekHigh;
  const price = metrics?.regularMarketPrice;
  const rangePos =
    lo !== undefined && hi !== undefined && price !== undefined && hi > lo
      ? Math.max(0, Math.min(100, ((price - lo) / (hi - lo)) * 100))
      : null;

  const hasMetricCharts = valuation.length > 0 || profitability.length > 0;

  return (
    <div className="charts-card" id="charts-section">
      <h3 className="charts-title">
        <BarChart3 size={20} />
        Visual Breakdown
      </h3>

      <div className="charts-grid">
        {valuation.length > 0 && (
          <MetricBars title="Valuation" data={valuation} />
        )}
        {profitability.length > 0 && (
          <MetricBars title="Profitability" data={profitability} />
        )}

        {/* Bull vs Bear balance — always rendered. */}
        <div className="chart-block">
          <h4 className="chart-block-title">
            <Scale size={13} style={{ verticalAlign: "-2px" }} /> Thesis Balance
          </h4>
          <div className="balance-bar">
            <div
              className="balance-bull"
              style={{ width: `${bullPct}%` }}
              title={`${bullCount} bull points`}
            >
              {bullPct >= 18 && <span>{bullPct}%</span>}
            </div>
            <div
              className="balance-bear"
              style={{ width: `${bearPct}%` }}
              title={`${bearCount} bear points`}
            >
              {bearPct >= 18 && <span>{bearPct}%</span>}
            </div>
          </div>
          <div className="balance-legend">
            <span className="balance-legend-item bull">
              {bullCount} Bull
            </span>
            <span className="balance-legend-item bear">
              {bearCount} Bear
            </span>
          </div>
        </div>

        {/* 52-week range position. */}
        {rangePos !== null && (
          <div className="chart-block">
            <h4 className="chart-block-title">52-Week Range</h4>
            <div className="range-track">
              <div
                className="range-marker"
                style={{ left: `${rangePos}%` }}
                title={fmtMoney(price)}
              />
            </div>
            <div className="range-labels">
              <span className="mono">{fmtMoney(lo)}</span>
              <span className="mono range-current">{fmtMoney(price)}</span>
              <span className="mono">{fmtMoney(hi)}</span>
            </div>
          </div>
        )}
      </div>

      {!hasMetricCharts && rangePos === null && (
        <p className="charts-note">
          Structured market data wasn&apos;t available for this company — the
          thesis balance above is derived from the AI analysis.
        </p>
      )}
    </div>
  );
}
