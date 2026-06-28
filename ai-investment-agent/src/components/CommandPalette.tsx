"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft, Clock, Star, TrendingUp } from "lucide-react";
import type { SavedResult } from "@/lib/types";

interface TickerSuggestion {
  symbol: string;
  name: string;
  exchange?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  history: SavedResult[];
  watchlist: string[];
  /** Run a fresh analysis for the given company. */
  onRun: (company: string) => void;
  /** Open an already-saved result without re-running the agent. */
  onOpen: (saved: SavedResult) => void;
}

/**
 * ⌘K / Ctrl-K command palette: fuzzy-jump to a previously analyzed company,
 * or run a new analysis for a typed name. No external dependency.
 */
export default function CommandPalette({
  open,
  onClose,
  history,
  watchlist,
  onRun,
  onOpen,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [tickerSuggestions, setTickerSuggestions] = useState<TickerSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset transient input state each time the palette opens.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setActiveIndex(0);
      setTickerSuggestions([]);
      // Focus after the modal paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const q = query.trim().toLowerCase();

  // Live ticker/company autocomplete as the user types — debounced, so a
  // typo like "relience" still surfaces "Reliance Industries" before they
  // hit Enter, instead of failing only after a full research run.
  useEffect(() => {
    if (q.length < 1) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setTickerSuggestions(Array.isArray(json.results) ? json.results : []);
      } catch {
        setTickerSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // Watchlist entries with no saved research yet — still worth surfacing as
  // a quick-jump row, since pinning shouldn't require having run an analysis.
  const watchlistOnly = useMemo(
    () =>
      watchlist.filter(
        (c) => !history.some((h) => h.result.companyName.toLowerCase() === c.toLowerCase())
      ),
    [watchlist, history]
  );

  const matches = useMemo(() => {
    if (!q) return history.slice(0, 8);
    return history
      .filter((h) => h.result.companyName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [history, q]);

  const watchlistMatches = useMemo(() => {
    if (!q) return watchlistOnly.slice(0, 4);
    return watchlistOnly.filter((c) => c.toLowerCase().includes(q)).slice(0, 4);
  }, [watchlistOnly, q]);

  // Live autocomplete results, deduped against rows already shown above —
  // no point suggesting "NVIDIA Corp" again if it's already in history.
  const tickerMatches = useMemo(() => {
    if (!q) return [];
    const shown = new Set([
      ...matches.map((h) => h.result.companyName.toLowerCase()),
      ...watchlistMatches.map((c) => c.toLowerCase()),
    ]);
    return tickerSuggestions.filter(
      (t) => !shown.has(t.name.toLowerCase()) && !shown.has(t.symbol.toLowerCase())
    ).slice(0, 5);
  }, [tickerSuggestions, matches, watchlistMatches, q]);

  // Rows: matched history entries, then pinned-but-unresearched companies,
  // then live ticker suggestions, then a "run new" row — only when the typed
  // text doesn't already exact-match something above (incl. a suggestion).
  const hasExact =
    history.some((h) => h.result.companyName.toLowerCase() === q) ||
    watchlistMatches.some((c) => c.toLowerCase() === q) ||
    tickerMatches.some((t) => t.symbol.toLowerCase() === q || t.name.toLowerCase() === q);
  const showRun = q.length > 0 && !hasExact;
  const rowCount =
    matches.length + watchlistMatches.length + tickerMatches.length + (showRun ? 1 : 0);

  if (!open) return null;

  const choose = (index: number) => {
    let i = index;
    if (i < matches.length) {
      const saved = matches[i];
      if (saved) onOpen(saved);
      onClose();
      return;
    }
    i -= matches.length;
    if (i < watchlistMatches.length) {
      onRun(watchlistMatches[i]);
      onClose();
      return;
    }
    i -= watchlistMatches.length;
    if (i < tickerMatches.length) {
      onRun(tickerMatches[i].name);
      onClose();
      return;
    }
    if (showRun) onRun(query.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(rowCount - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rowCount > 0) choose(Math.min(activeIndex, rowCount - 1));
      else if (query.trim()) {
        onRun(query.trim());
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const isPinned = (name: string) =>
    watchlist.some((c) => c.toLowerCase() === name.toLowerCase());

  return (
    <div className="palette-overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input-row">
          <Search size={18} className="palette-search-icon" />
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Jump to a company or analyze a new one…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          <kbd className="palette-kbd">ESC</kbd>
        </div>

        <div className="palette-list">
          {matches.map((h, i) => (
            <button
              key={h.id}
              className={`palette-row ${activeIndex === i ? "active" : ""}`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => choose(i)}
            >
              {isPinned(h.result.companyName) ? (
                <Star size={14} className="palette-row-icon pinned" />
              ) : (
                <Clock size={14} className="palette-row-icon" />
              )}
              <span className="palette-row-name">
                {h.result.companyName}
              </span>
              <span
                className={`palette-row-tag ${
                  h.result.recommendation.decision === "INVEST"
                    ? "invest"
                    : "pass"
                }`}
              >
                {h.result.recommendation.decision}
              </span>
            </button>
          ))}

          {watchlistMatches.map((company, i) => {
            const index = matches.length + i;
            return (
              <button
                key={company}
                className={`palette-row ${activeIndex === index ? "active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
              >
                <Star size={14} className="palette-row-icon pinned" />
                <span className="palette-row-name">{company}</span>
                <span className="palette-row-hint">analyze</span>
              </button>
            );
          })}

          {tickerMatches.map((t, i) => {
            const index = matches.length + watchlistMatches.length + i;
            return (
              <button
                key={t.symbol}
                className={`palette-row ${activeIndex === index ? "active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
              >
                <TrendingUp size={14} className="palette-row-icon" />
                <span className="palette-row-name">{t.name}</span>
                <span className="palette-row-hint mono">{t.symbol}</span>
              </button>
            );
          })}

          {showRun && (
            <button
              className={`palette-row run ${
                activeIndex === matches.length + watchlistMatches.length + tickerMatches.length
                  ? "active"
                  : ""
              }`}
              onMouseEnter={() =>
                setActiveIndex(matches.length + watchlistMatches.length + tickerMatches.length)
              }
              onClick={() =>
                choose(matches.length + watchlistMatches.length + tickerMatches.length)
              }
            >
              <CornerDownLeft size={14} className="palette-row-icon" />
              <span className="palette-row-name">
                Analyze <strong>{query.trim()}</strong>
              </span>
              <span className="palette-row-hint">new research</span>
            </button>
          )}

          {rowCount === 0 && (
            <div className="palette-empty">
              Type a company name and press Enter to analyze it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
