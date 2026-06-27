"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WidgetInstance, WidgetType, SavedLayout, SizePreset } from "./types";
import { SIZE_PRESETS } from "./types";
import { WIDGET_META, buildDefaultDashboard, newWidgetId } from "./widgetMeta";

// v3: dropped the react-grid-layout free-positioning model in favour of an
// ordered widget list rendered by a deterministic CSS grid. Bumping the key
// also discards any corrupted v2 layouts that rendered as a collapsed column.
const STORAGE_KEY = "investorai:dashboard:v3";

interface PersistedState {
  widgets: WidgetInstance[];
  saved: SavedLayout[];
}

function initialState(): PersistedState {
  const { widgets } = buildDefaultDashboard();
  return { widgets, saved: [] };
}

/** Ensure every widget has a usable size, falling back to its meta default. */
function withSizes(widgets: WidgetInstance[]): WidgetInstance[] {
  return widgets
    .filter((w) => WIDGET_META[w.type]) // drop unknown/removed widget types
    .map((w) => {
      const meta = WIDGET_META[w.type];
      return { ...w, w: w.w ?? meta.w, h: w.h ?? meta.h };
    });
}

function load(): PersistedState {
  if (typeof window === "undefined") return initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!parsed.widgets || !Array.isArray(parsed.widgets) || parsed.widgets.length === 0)
      return initialState();
    return {
      widgets: withSizes(parsed.widgets),
      saved: parsed.saved ?? [],
    };
  } catch {
    return initialState();
  }
}

function persist(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

/** Cycle a widget through the discrete size presets (sm → md → lg → xl → sm). */
function nextSize(w: number, h: number): { w: number; h: number } {
  const order: SizePreset[] = ["sm", "md", "lg", "xl"];
  const idx = order.findIndex((p) => SIZE_PRESETS[p].w === w && SIZE_PRESETS[p].h === h);
  const next = SIZE_PRESETS[order[(idx + 1) % order.length]];
  return { w: next.w, h: next.h };
}

export function useDashboardStore() {
  const [state, setState] = useState<PersistedState>(initialState);
  const [editMode, setEditMode] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) persist(state);
  }, [state, hydrated]);

  const addWidget = useCallback((type: WidgetType) => {
    setState((s) => {
      const meta = WIDGET_META[type];
      const w: WidgetInstance = { id: newWidgetId(type), type, w: meta.w, h: meta.h };
      return { ...s, widgets: [...s.widgets, w] };
    });
  }, []);

  const removeWidget = useCallback((id: string) => {
    setState((s) => ({ ...s, widgets: s.widgets.filter((w) => w.id !== id) }));
  }, []);

  const duplicateWidget = useCallback((id: string) => {
    setState((s) => {
      const idx = s.widgets.findIndex((w) => w.id === id);
      if (idx === -1) return s;
      const src = s.widgets[idx];
      const copy: WidgetInstance = { ...src, id: newWidgetId(src.type) };
      const widgets = [...s.widgets];
      widgets.splice(idx + 1, 0, copy);
      return { ...s, widgets };
    });
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      widgets: s.widgets.map((w) =>
        w.id === id ? { ...w, collapsed: !w.collapsed } : w
      ),
    }));
  }, []);

  const togglePin = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      widgets: s.widgets.map((w) =>
        w.id === id ? { ...w, pinned: !w.pinned } : w
      ),
    }));
  }, []);

  /** Cycle a single widget's size preset. */
  const cycleSize = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      widgets: s.widgets.map((w) => {
        if (w.id !== id) return w;
        const meta = WIDGET_META[w.type];
        return { ...w, ...nextSize(w.w ?? meta.w, w.h ?? meta.h) };
      }),
    }));
  }, []);

  /** Move the widget with id `from` to occupy the position of id `to`. */
  const reorderWidget = useCallback((from: string, to: string) => {
    setState((s) => {
      if (from === to) return s;
      const widgets = [...s.widgets];
      const fromIdx = widgets.findIndex((w) => w.id === from);
      const toIdx = widgets.findIndex((w) => w.id === to);
      if (fromIdx === -1 || toIdx === -1) return s;
      const [moved] = widgets.splice(fromIdx, 1);
      widgets.splice(toIdx, 0, moved);
      return { ...s, widgets };
    });
  }, []);

  const resetLayout = useCallback(() => {
    const { widgets } = buildDefaultDashboard();
    setState((s) => ({ ...s, widgets }));
  }, []);

  const saveCurrentAs = useCallback((name: string) => {
    setState((s) => ({
      ...s,
      saved: [
        ...s.saved.filter((l) => l.name !== name),
        { id: `layout-${Date.now().toString(36)}`, name, widgets: s.widgets },
      ],
    }));
  }, []);

  const loadSaved = useCallback((id: string) => {
    setState((s) => {
      const l = s.saved.find((x) => x.id === id);
      if (!l) return s;
      return { ...s, widgets: withSizes(l.widgets) };
    });
  }, []);

  const deleteSaved = useCallback((id: string) => {
    setState((s) => ({ ...s, saved: s.saved.filter((l) => l.id !== id) }));
  }, []);

  const exportLayout = useCallback(() => {
    return JSON.stringify({ widgets: state.widgets }, null, 2);
  }, [state.widgets]);

  const importLayout = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.widgets || !Array.isArray(parsed.widgets)) return false;
      setState((s) => ({ ...s, widgets: withSizes(parsed.widgets) }));
      return true;
    } catch {
      return false;
    }
  }, []);

  return useMemo(
    () => ({
      hydrated,
      widgets: state.widgets,
      saved: state.saved,
      editMode,
      presentation,
      setEditMode,
      setPresentation,
      addWidget,
      removeWidget,
      duplicateWidget,
      toggleCollapse,
      togglePin,
      cycleSize,
      reorderWidget,
      resetLayout,
      saveCurrentAs,
      loadSaved,
      deleteSaved,
      exportLayout,
      importLayout,
    }),
    [
      hydrated,
      state.widgets,
      state.saved,
      editMode,
      presentation,
      addWidget,
      removeWidget,
      duplicateWidget,
      toggleCollapse,
      togglePin,
      cycleSize,
      reorderWidget,
      resetLayout,
      saveCurrentAs,
      loadSaved,
      deleteSaved,
      exportLayout,
      importLayout,
    ]
  );
}

export type DashboardStore = ReturnType<typeof useDashboardStore>;
