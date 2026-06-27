"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  AlertTriangle,
  BarChart3,
  Newspaper,
  Building2,
  ChevronDown,
  ChevronUp,
  Zap,
  CheckCircle2,
  XCircle,
  Star,
} from "lucide-react";
import Markdown from "./Markdown";
import FinancialCharts from "./FinancialCharts";
import type { ResearchResult } from "@/lib/types";

interface ResultsDisplayProps {
  data: ResearchResult;
  pinned?: boolean;
  onTogglePin?: (company: string) => void;
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  id,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section" id={id}>
      <button
        className="collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="collapsible-title">
          <Icon size={20} />
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isOpen && <div className="collapsible-content">{children}</div>}
    </div>
  );
}

/** Compact confidence gauge: three segments lit by HIGH / MEDIUM / LOW. */
function ConfidenceGauge({ level }: { level: string }) {
  const lvl = (level || "").toUpperCase();
  const lit = lvl === "HIGH" ? 3 : lvl === "MEDIUM" ? 2 : 1;
  const cls = lvl === "HIGH" ? "high" : lvl === "MEDIUM" ? "medium" : "low";
  return (
    <div className="gauge" title={`${level} confidence`}>
      <div className="gauge-segments">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`gauge-seg ${i < lit ? `lit ${cls}` : ""}`}
          />
        ))}
      </div>
      <span className={`gauge-label ${cls}`}>{lvl} CONVICTION</span>
    </div>
  );
}

const fmtMoney = (n?: number) =>
  n === undefined || n === null
    ? null
    : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function ResultsDisplay({
  data,
  pinned = false,
  onTogglePin,
}: ResultsDisplayProps) {
  const { recommendation: rec, financialMetrics: fm } = data;
  const isInvest = rec.decision === "INVEST";

  const price = fmtMoney(fm?.regularMarketPrice ?? undefined);
  const changePct = fm?.regularMarketChangePercent;
  const changeUp = (changePct ?? 0) >= 0;

  const riskClass = rec.riskLevel?.toLowerCase().replace(" ", "-");

  return (
    <div className="results-container fade-in">
      {/* One-line scannable decision strip */}
      <div className={`decision-strip ${isInvest ? "invest" : "pass"}`}>
        <span className="strip-ticker mono">
          {fm?.symbol || data.companyName}
        </span>
        <span className="strip-sep">·</span>
        <span className={`strip-decision ${isInvest ? "invest" : "pass"}`}>
          {rec.decision}
        </span>
        <span className="strip-sep">·</span>
        <span className={`strip-conf conf-${rec.confidence?.toLowerCase()}`}>
          {rec.confidence}
        </span>
        <span className="strip-sep">·</span>
        <span className={`strip-risk risk-${riskClass}`}>
          {rec.riskLevel} RISK
        </span>
        {rec.targetTimeframe && (
          <>
            <span className="strip-sep">·</span>
            <span className="strip-tf">{rec.targetTimeframe}</span>
          </>
        )}
        {price && (
          <span className="strip-price-group">
            <span className="strip-price mono">{price}</span>
            {changePct !== undefined && (
              <span className={`strip-change mono ${changeUp ? "up" : "down"}`}>
                {changeUp ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
              </span>
            )}
          </span>
        )}
      </div>

      {/* Hero Recommendation Card */}
      <div
        className={`recommendation-hero ${isInvest ? "invest" : "pass"}`}
        id="recommendation-card"
      >
        <div className="hero-badge">
          {isInvest ? (
            <TrendingUp size={32} className="hero-icon" />
          ) : (
            <TrendingDown size={32} className="hero-icon" />
          )}
        </div>
        <div className="hero-content">
          <div className="hero-top-row">
            <div>
              <div className="hero-label">AI Recommendation for</div>
              <h2 className="hero-company">{data.companyName}</h2>
            </div>
            {onTogglePin && (
              <button
                className={`hero-pin ${pinned ? "pinned" : ""}`}
                onClick={() => onTogglePin(data.companyName)}
                title={pinned ? "Remove from watchlist" : "Add to watchlist"}
              >
                <Star size={18} />
                <span>{pinned ? "Watching" : "Watch"}</span>
              </button>
            )}
          </div>
          <div className={`hero-decision ${isInvest ? "invest" : "pass"}`}>
            {rec.decision}
          </div>
          <p className="hero-summary">{rec.summary}</p>
          <div className="hero-meta">
            <ConfidenceGauge level={rec.confidence} />
            <span className={`meta-badge risk-${riskClass}`}>
              <Shield size={14} />
              {rec.riskLevel} Risk
            </span>
            {rec.targetTimeframe && (
              <span className="meta-badge timeframe">
                <Target size={14} />
                {rec.targetTimeframe}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visual Breakdown (charts) */}
      <FinancialCharts
        metrics={fm}
        bullCount={rec.bullCase?.length ?? 0}
        bearCount={rec.bearCase?.length ?? 0}
      />

      {/* Bull vs Bear Grid */}
      <div className="bull-bear-grid" id="bull-bear-section">
        <div className="case-card bull">
          <h3 className="case-title">
            <CheckCircle2 size={20} />
            Bull Case
          </h3>
          <ul className="case-list">
            {rec.bullCase?.map((point, i) => (
              <li key={i} className="case-item bull-item">
                <TrendingUp size={16} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="case-card bear">
          <h3 className="case-title">
            <XCircle size={20} />
            Bear Case
          </h3>
          <ul className="case-list">
            {rec.bearCase?.map((point, i) => (
              <li key={i} className="case-item bear-item">
                <AlertTriangle size={16} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Key Metrics */}
      {rec.keyMetrics && Object.keys(rec.keyMetrics).length > 0 && (
        <div className="metrics-card" id="key-metrics-section">
          <h3 className="metrics-title">
            <BarChart3 size={20} />
            Key Metrics
          </h3>
          <div className="metrics-grid">
            {Object.entries(rec.keyMetrics).map(([key, value]) => (
              <div key={key} className="metric-item">
                <span className="metric-label">
                  {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                <span className="metric-value mono">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Catalysts */}
      {rec.catalysts && rec.catalysts.length > 0 && (
        <div className="catalysts-card" id="catalysts-section">
          <h3 className="catalysts-title">
            <Zap size={20} />
            Upcoming Catalysts
          </h3>
          <div className="catalysts-list">
            {rec.catalysts.map((catalyst, i) => (
              <div key={i} className="catalyst-item">
                <Zap size={16} />
                <span>{catalyst}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Detail Sections */}
      <div className="detail-sections">
        <CollapsibleSection
          title="Full Investment Analysis"
          icon={BarChart3}
          defaultOpen={true}
          id="analysis-section"
        >
          <Markdown text={data.analysis} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Company Profile"
          icon={Building2}
          id="company-profile-section"
        >
          <Markdown text={data.companyInfo} />
        </CollapsibleSection>

        <CollapsibleSection
          title="News & Market Sentiment"
          icon={Newspaper}
          id="news-section"
        >
          <Markdown text={data.newsData} />
        </CollapsibleSection>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer" id="disclaimer">
        <AlertTriangle size={16} />
        <p>
          This analysis is generated by an AI agent and is for educational and
          informational purposes only. It does not constitute financial advice.
          Always consult with a qualified financial advisor before making
          investment decisions.
        </p>
      </div>
    </div>
  );
}
