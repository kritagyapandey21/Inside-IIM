"use client";

import { Star, Clock, X, Trash2, History } from "lucide-react";
import type { SavedResult } from "@/lib/types";

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  history: SavedResult[];
  watchlist: string[];
  activeCompany?: string | null;
  onOpen: (saved: SavedResult) => void;
  onTogglePin: (company: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Row({
  saved,
  pinned,
  active,
  onOpen,
  onTogglePin,
  onRemove,
}: {
  saved: SavedResult;
  pinned: boolean;
  active: boolean;
  onOpen: (s: SavedResult) => void;
  onTogglePin: (c: string) => void;
  onRemove: (id: string) => void;
}) {
  const { companyName, recommendation } = saved.result;
  const isInvest = recommendation.decision === "INVEST";
  return (
    <div className={`drawer-row ${active ? "active" : ""}`}>
      <button className="drawer-row-main" onClick={() => onOpen(saved)}>
        <span className={`drawer-dot ${isInvest ? "invest" : "pass"}`} />
        <span className="drawer-row-info">
          <span className="drawer-row-name">{companyName}</span>
          <span className="drawer-row-meta">
            <span className={`drawer-decision ${isInvest ? "invest" : "pass"}`}>
              {recommendation.decision}
            </span>
            <span className="drawer-conf">{recommendation.confidence}</span>
            <span className="drawer-time">{timeAgo(saved.savedAt)}</span>
          </span>
        </span>
      </button>
      <div className="drawer-row-actions">
        <button
          className={`drawer-icon-btn ${pinned ? "pinned" : ""}`}
          onClick={() => onTogglePin(companyName)}
          aria-label={pinned ? "Unpin" : "Pin to watchlist"}
          title={pinned ? "Unpin" : "Pin to watchlist"}
        >
          <Star size={14} />
        </button>
        <button
          className="drawer-icon-btn"
          onClick={() => onRemove(saved.id)}
          aria-label="Remove"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/**
 * Slide-in right drawer listing the pinned watchlist and recent research.
 * Clicking a row re-opens the saved result without re-running the agent.
 */
export default function HistoryDrawer({
  open,
  onClose,
  history,
  watchlist,
  activeCompany,
  onOpen,
  onTogglePin,
  onRemove,
  onClear,
}: HistoryDrawerProps) {
  const isPinned = (name: string) =>
    watchlist.some((c) => c.toLowerCase() === name.toLowerCase());

  const pinned = history.filter((h) => isPinned(h.result.companyName));
  const recent = history.filter((h) => !isPinned(h.result.companyName));
  const isActive = (name: string) =>
    !!activeCompany && name.toLowerCase() === activeCompany.toLowerCase();

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
      />
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-header">
          <div className="drawer-title">
            <History size={16} />
            <span>Workspace</span>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {pinned.length > 0 && (
            <section className="drawer-section">
              <h4 className="drawer-section-title">
                <Star size={12} /> Watchlist
              </h4>
              {pinned.map((h) => (
                <Row
                  key={h.id}
                  saved={h}
                  pinned
                  active={isActive(h.result.companyName)}
                  onOpen={onOpen}
                  onTogglePin={onTogglePin}
                  onRemove={onRemove}
                />
              ))}
            </section>
          )}

          <section className="drawer-section">
            <div className="drawer-section-head">
              <h4 className="drawer-section-title">
                <Clock size={12} /> Recent
              </h4>
              {recent.length > 0 && (
                <button className="drawer-clear" onClick={onClear}>
                  Clear
                </button>
              )}
            </div>
            {recent.length === 0 && pinned.length === 0 ? (
              <p className="drawer-empty">
                No research yet. Analyze a company to start building your
                workspace.
              </p>
            ) : recent.length === 0 ? (
              <p className="drawer-empty">All caught up.</p>
            ) : (
              recent.map((h) => (
                <Row
                  key={h.id}
                  saved={h}
                  pinned={false}
                  active={isActive(h.result.companyName)}
                  onOpen={onOpen}
                  onTogglePin={onTogglePin}
                  onRemove={onRemove}
                />
              ))
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
