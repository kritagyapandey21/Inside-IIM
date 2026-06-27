"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/* Chart palette — uses theme CSS vars so it adapts to light/dark. */
export const CHART = {
  positive: "var(--positive)",
  negative: "var(--negative)",
  warning: "var(--warning)",
  neutral: "var(--muted-foreground)",
  grid: "var(--border)",
  axis: "var(--muted-foreground)",
  accent: "var(--foreground)",
};

export const VERDICT_COLOR: Record<string, string> = {
  INVEST: "var(--positive)",
  WATCH: "var(--warning)",
  PASS: "var(--negative)",
};

/** Colored +/- delta text. */
export function Delta({
  value,
  suffix = "%",
  className,
}: {
  value?: number | null;
  suffix?: string;
  className?: string;
}) {
  if (value === undefined || value === null || Number.isNaN(value))
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums",
        up ? "text-positive" : "text-negative",
        className
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {value.toFixed(2)}
      {suffix}
    </span>
  );
}

/** A compact metric tile (label + value + optional sub). */
export function MetricTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-background-secondary p-3">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="mono text-base font-semibold leading-none">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

/** Circular conviction/score ring (0-100). */
export function ScoreRing({
  score,
  size = 110,
  label = "Overall Score",
  color,
}: {
  score: number;
  size?: number;
  label?: string;
  color?: string;
}) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circ;
  const stroke =
    color ?? (clamped >= 65 ? "var(--positive)" : clamped >= 40 ? "var(--warning)" : "var(--negative)");
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={7}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="mono text-2xl font-bold leading-none">{Math.round(clamped)}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      <span className="mt-2 text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

/** Horizontal gauge bar (0-100 or arbitrary range mapped to %). */
export function GaugeBar({
  label,
  pct,
  display,
  tone = "neutral",
}: {
  label: string;
  pct: number;
  display: string;
  tone?: "positive" | "negative" | "warning" | "neutral";
}) {
  const color =
    tone === "positive"
      ? "var(--positive)"
      : tone === "negative"
      ? "var(--negative)"
      : tone === "warning"
      ? "var(--warning)"
      : "var(--muted-foreground)";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="mono font-medium">{display}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color, transition: "width 0.5s ease" }}
        />
      </div>
    </div>
  );
}

/** Bullet list with colored dot, used by thesis/SWOT widgets. */
export function PointList({
  points,
  tone = "neutral",
}: {
  points: string[];
  tone?: "positive" | "negative" | "warning" | "neutral";
}) {
  const color =
    tone === "positive"
      ? "var(--positive)"
      : tone === "negative"
      ? "var(--negative)"
      : tone === "warning"
      ? "var(--warning)"
      : "var(--muted-foreground)";
  return (
    <ul className="flex flex-col gap-2">
      {points.map((p, i) => (
        <li key={i} className="flex gap-2 text-sm leading-snug">
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: color }}
          />
          <span className="text-foreground/90">{p}</span>
        </li>
      ))}
    </ul>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h4>
  );
}
