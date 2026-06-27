"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft, Clock, Star } from "lucide-react";
import type { SavedResult } from "@/lib/types";

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset transient input state each time the palette opens.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setActiveIndex(0);
      // Focus after the modal paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return history.slice(0, 8);
    return history
      .filter((h) => h.result.companyName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [history, q]);

  // Rows: matched history entries, then a "run new" row when text is typed
  // and isn't an exact existing match.
  const hasExact = history.some(
    (h) => h.result.companyName.toLowerCase() === q
  );
  const showRun = q.length > 0 && !hasExact;
  const rowCount = matches.length + (showRun ? 1 : 0);

  if (!open) return null;

  const choose = (index: number) => {
    if (showRun && index === matches.length) {
      onRun(query.trim());
    } else {
      const saved = matches[index];
      if (saved) onOpen(saved);
    }
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

          {showRun && (
            <button
              className={`palette-row run ${
                activeIndex === matches.length ? "active" : ""
              }`}
              onMouseEnter={() => setActiveIndex(matches.length)}
              onClick={() => choose(matches.length)}
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
