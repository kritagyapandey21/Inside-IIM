/**
 * Layout types kept local (structurally compatible with react-grid-layout,
 * which accepts plain objects). Avoids the package's `export = namespace`
 * resolution quirks.
 */
export interface GridLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface Layouts {
  [breakpoint: string]: GridLayout[];
}

/** All widget types available in the dashboard. Only real-data widgets exist. */
export type WidgetType =
  | "ai-recommendation"
  | "executive-summary"
  | "price-chart"
  | "stock-performance"
  | "key-metrics"
  | "valuation"
  | "revenue-growth"
  | "financial-health"
  | "business-health"
  | "key-financials"
  | "analyst-consensus"
  | "investment-thesis"
  | "bull-thesis"
  | "bear-thesis"
  | "risk-score"
  | "swot"
  | "moat"
  | "institutional-ownership"
  | "insider-activity"
  | "recent-catalysts"
  | "news-sentiment"
  | "comparables"
  | "dividends"
  | "notes"
  | "ai-chat";

/** Which data source feeds a widget — used for loading/empty orchestration. */
export type WidgetSource = "ai" | "market" | "local";

export interface WidgetMeta {
  type: WidgetType;
  title: string;
  description: string;
  source: WidgetSource;
  /** Default grid size on the lg breakpoint (12 cols). */
  w: number;
  h: number;
  minW: number;
  minH: number;
  /** Which header tabs this widget appears on. "overview" shows all. */
  tabs: string[];
}

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  collapsed?: boolean;
  pinned?: boolean;
  /** Optional per-instance size override (in grid units). Falls back to meta. */
  w?: number;
  h?: number;
}

export interface SavedLayout {
  id: string;
  name: string;
  widgets: WidgetInstance[];
  /** Legacy react-grid-layout payload; retained for import/export compatibility. */
  layouts?: Layouts;
}

/** Discrete size presets used by the in-card size cycler (in 12-col grid units). */
export type SizePreset = "sm" | "md" | "lg" | "xl";

export const SIZE_PRESETS: Record<SizePreset, { w: number; h: number; label: string }> = {
  sm: { w: 3, h: 5, label: "Small" },
  md: { w: 4, h: 6, label: "Medium" },
  lg: { w: 6, h: 7, label: "Large" },
  xl: { w: 8, h: 8, label: "Wide" },
};
