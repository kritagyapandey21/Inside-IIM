"use client";

import { useCallback, useEffect, useState } from "react";
import type { ResearchResult, SavedResult } from "./types";

const STORAGE_KEY = "investorai:v1";
const MAX_HISTORY = 50;

type Theme = "dark" | "light";

interface PersistedState {
  history: SavedResult[];
  watchlist: string[];
  theme: Theme;
}

const EMPTY: PersistedState = { history: [], watchlist: [], theme: "dark" };

function load(): PersistedState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      history: Array.isArray(parsed.history) ? parsed.history : [],
      watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
      theme: parsed.theme === "light" ? "light" : "dark",
    };
  } catch {
    return EMPTY;
  }
}

function save(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage unavailable — fail silently.
  }
}

const normalize = (name: string) => name.trim().toLowerCase();

/**
 * Client-side persistence for research history, a pinned watchlist, and the
 * theme preference. Backed by localStorage; safe to call during SSR.
 */
export function useResearchStore() {
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount. Intentionally a post-mount setState to
  // avoid an SSR/client hydration mismatch (localStorage is client-only).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load());
    setHydrated(true);
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (hydrated) save(state);
  }, [state, hydrated]);

  // Keep the <html> class + data-theme attribute in sync for CSS.
  useEffect(() => {
    if (typeof document !== "undefined") {
      const html = document.documentElement;
      html.setAttribute("data-theme", state.theme);
      if (state.theme === "dark") {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    }
  }, [state.theme]);

  const saveResult = useCallback((result: ResearchResult) => {
    setState((prev) => {
      const key = normalize(result.companyName);
      // Dedupe by company (latest wins), newest first, capped.
      const filtered = prev.history.filter(
        (h) => normalize(h.result.companyName) !== key
      );
      const entry: SavedResult = {
        id: `${key}-${Date.now()}`,
        result,
        savedAt: Date.now(),
      };
      return { ...prev, history: [entry, ...filtered].slice(0, MAX_HISTORY) };
    });
  }, []);

  const removeHistory = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      history: prev.history.filter((h) => h.id !== id),
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, history: [] }));
  }, []);

  const togglePin = useCallback((company: string) => {
    setState((prev) => {
      const key = normalize(company);
      const exists = prev.watchlist.some((c) => normalize(c) === key);
      return {
        ...prev,
        watchlist: exists
          ? prev.watchlist.filter((c) => normalize(c) !== key)
          : [company, ...prev.watchlist],
      };
    });
  }, []);

  const isPinned = useCallback(
    (company: string) =>
      state.watchlist.some((c) => normalize(c) === normalize(company)),
    [state.watchlist]
  );

  const toggleTheme = useCallback(() => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === "dark" ? "light" : "dark",
    }));
  }, []);

  return {
    hydrated,
    history: state.history,
    watchlist: state.watchlist,
    theme: state.theme,
    saveResult,
    removeHistory,
    clearHistory,
    togglePin,
    isPinned,
    toggleTheme,
  };
}
