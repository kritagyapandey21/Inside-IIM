"use client";

import { CheckCircle2, XCircle, Zap, Shield, Lightbulb, Calendar, AlertTriangle } from "lucide-react";
import { useDashboardData } from "@/lib/dashboard/DashboardContext";
import Markdown from "@/components/Markdown";
import { Badge } from "@/components/ui/badge";
import {
  WidgetError,
  WidgetEmpty,
  WidgetSpinner,
} from "./WidgetStates";
import {
  ScoreRing,
  PointList,
  SectionLabel,
  VERDICT_COLOR,
} from "./parts";
import { cn } from "@/lib/utils";
import type { Recommendation } from "@/lib/types";

/**
 * The research API falls back to this exact empty shape when the LLM's
 * output isn't valid JSON (see /api/research) — no bull/bear case, no key
 * metrics, no catalysts. Treat that shape as a degraded/failed analysis
 * rather than a genuine confident PASS, so we don't show a fabricated score.
 */
function isDegraded(rec: Recommendation): boolean {
  return (
    (rec.bullCase ?? []).length === 0 &&
    (rec.catalysts ?? []).length === 0 &&
    Object.keys(rec.keyMetrics ?? {}).length === 0
  );
}

/** Wrap an AI widget body with shared loading/error/empty handling. */
function useAi() {
  const { research, researchLoading, researchError, researchStep } = useDashboardData();
  return { research, researchLoading, researchError, researchStep };
}

const STEP_LABELS = [
  "Gathering company data…",
  "Fetching financials…",
  "Analyzing news…",
  "Synthesizing thesis…",
  "Generating verdict…",
];

function AiGate({
  children,
}: {
  children: () => React.ReactNode;
}) {
  const { research, researchLoading, researchError, researchStep } = useAi();
  if (researchLoading) return <WidgetSpinner label={STEP_LABELS[researchStep]} />;
  if (researchError) return <WidgetError message={researchError} />;
  if (!research) return <WidgetEmpty label="Run an analysis to populate" />;
  return <>{children()}</>;
}

export function AIRecommendation() {
  const { research } = useAi();
  return (
    <AiGate>
      {() => {
        const rec = research!.recommendation;
        if (isDegraded(rec)) {
          return (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <AlertTriangle className="h-6 w-6 text-warning" />
              <span className="text-sm font-semibold text-warning">Analysis Incomplete</span>
              <p className="line-clamp-3 max-w-xs text-xs text-muted-foreground">
                The AI couldn&apos;t produce a confident verdict from the available data. Try refreshing the analysis.
              </p>
            </div>
          );
        }
        const verdict = (rec.decision || "").toUpperCase();
        const color = VERDICT_COLOR[verdict] ?? "var(--muted-foreground)";
        const score = rec.score ?? 50;
        return (
          <div className="flex h-full items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-3xl font-bold tracking-tight" style={{ color }}>
                {verdict}
              </span>
              <span className="text-sm font-medium text-warning">
                {rec.riskLevel} Risk
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge variant="outline">{rec.confidence} confidence</Badge>
                {rec.targetTimeframe && (
                  <Badge variant="outline">{rec.targetTimeframe}</Badge>
                )}
              </div>
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                {rec.summary}
              </p>
            </div>
            <ScoreRing score={score} color={color} />
          </div>
        );
      }}
    </AiGate>
  );
}

export function ExecutiveSummary() {
  const { research } = useAi();
  return (
    <AiGate>
      {() => (
        <div className="h-full overflow-auto pb-2 pr-1 text-sm">
          <Markdown text={research!.analysis} />
        </div>
      )}
    </AiGate>
  );
}

export function InvestmentThesis() {
  const { research } = useAi();
  return (
    <AiGate>
      {() => {
        const rec = research!.recommendation;
        return (
          <div className="flex h-full flex-col gap-3 overflow-auto pb-2 pr-1">
            <div>
              <SectionLabel>
                <span className="inline-flex items-center gap-1.5 text-positive">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Bull Case
                </span>
              </SectionLabel>
              <PointList points={rec.bullCase ?? []} tone="positive" />
            </div>
            <div>
              <SectionLabel>
                <span className="inline-flex items-center gap-1.5 text-negative">
                  <XCircle className="h-3.5 w-3.5" /> Bear Case
                </span>
              </SectionLabel>
              <PointList points={rec.bearCase ?? []} tone="negative" />
            </div>
            {rec.catalysts?.length > 0 && (
              <div>
                <SectionLabel>
                  <span className="inline-flex items-center gap-1.5 text-warning">
                    <Zap className="h-3.5 w-3.5" /> Catalysts
                  </span>
                </SectionLabel>
                <PointList points={rec.catalysts} tone="warning" />
              </div>
            )}
          </div>
        );
      }}
    </AiGate>
  );
}

export function BullThesis() {
  const { research } = useAi();
  return (
    <AiGate>
      {() => (
        <div className="h-full overflow-auto pb-2 pr-1">
          <PointList points={research!.recommendation.bullCase ?? []} tone="positive" />
        </div>
      )}
    </AiGate>
  );
}

export function BearThesis() {
  const { research } = useAi();
  return (
    <AiGate>
      {() => (
        <div className="h-full overflow-auto pb-2 pr-1">
          <PointList points={research!.recommendation.bearCase ?? []} tone="negative" />
        </div>
      )}
    </AiGate>
  );
}

export function RiskScore() {
  const { research } = useAi();
  return (
    <AiGate>
      {() => {
        const rec = research!.recommendation;
        const risk = (rec.riskLevel || "").toUpperCase();
        const map: Record<string, number> = {
          LOW: 25,
          MODERATE: 55,
          HIGH: 78,
          "VERY HIGH": 92,
        };
        const pct = map[risk] ?? 50;
        const tone = pct >= 75 ? "var(--negative)" : pct >= 50 ? "var(--warning)" : "var(--positive)";
        return (
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5" style={{ color: tone }} />
              <span className="text-lg font-semibold" style={{ color: tone }}>
                {rec.riskLevel}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} />
            </div>
            <p className="text-xs text-muted-foreground">
              Risk derived from the AI analysis of business, market, and macro factors.
            </p>
          </div>
        );
      }}
    </AiGate>
  );
}

export function SWOTWidget() {
  const { research } = useAi();
  return (
    <AiGate>
      {() => {
        const swot = research!.recommendation.swot;
        if (!swot) return <WidgetEmpty label="SWOT not available" />;
        const cells: [string, string[], "positive" | "negative" | "warning" | "neutral"][] = [
          ["Strengths", swot.strengths ?? [], "positive"],
          ["Weaknesses", swot.weaknesses ?? [], "negative"],
          ["Opportunities", swot.opportunities ?? [], "warning"],
          ["Threats", swot.threats ?? [], "neutral"],
        ];
        return (
          <div className="grid h-full grid-cols-2 gap-3 overflow-auto pb-2 pr-1">
            {cells.map(([title, points, tone]) => (
              <div key={title} className="rounded-lg border border-border bg-background-secondary p-3">
                <SectionLabel>{title}</SectionLabel>
                <PointList points={points} tone={tone} />
              </div>
            ))}
          </div>
        );
      }}
    </AiGate>
  );
}

export function MoatWidget() {
  const { research } = useAi();
  return (
    <AiGate>
      {() => {
        const moat = research!.recommendation.moat;
        if (!moat) return <WidgetEmpty label="Moat analysis not available" />;
        return (
          <div className="flex h-full flex-col gap-3 overflow-auto pb-2 pr-1">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              <span className="text-lg font-semibold">{moat.rating} Moat</span>
            </div>
            <PointList points={moat.reasons ?? []} tone="neutral" />
          </div>
        );
      }}
    </AiGate>
  );
}

export function RecentCatalysts() {
  const { research } = useAi();
  const { market } = useDashboardData();
  return (
    <AiGate>
      {() => {
        const catalysts = research!.recommendation.catalysts ?? [];
        const events = market?.calendar ?? [];
        return (
          <div className="flex h-full flex-col gap-3 overflow-auto pb-2 pr-1">
            {events.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {events.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground/90">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {e.label}
                    </span>
                    <span className="mono text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {catalysts.length > 0 ? (
              <PointList points={catalysts} tone="warning" />
            ) : (
              events.length === 0 && <WidgetEmpty label="No catalysts identified" />
            )}
          </div>
        );
      }}
    </AiGate>
  );
}

export function NewsSentiment() {
  const { research } = useAi();
  return (
    <AiGate>
      {() => {
        const text = research!.newsData || "";
        const lc = text.toLowerCase();
        const sentiment = /bullish|positive/.test(lc)
          ? { label: "Bullish", tone: "positive" as const }
          : /bearish|negative/.test(lc)
          ? { label: "Bearish", tone: "negative" as const }
          : { label: "Neutral", tone: "warning" as const };
        return (
          <div className="flex h-full flex-col gap-3 overflow-auto pb-2 pr-1">
            <Badge
              variant={sentiment.tone}
              className={cn("w-fit text-sm")}
            >
              {sentiment.label} sentiment
            </Badge>
            <div className="text-sm">
              <Markdown text={text} />
            </div>
          </div>
        );
      }}
    </AiGate>
  );
}
