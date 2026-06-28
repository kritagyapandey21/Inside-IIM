"use client";

import { useEffect, useState } from "react";
import { Star, X, RefreshCw } from "lucide-react";
import CompanyLogo from "@/components/CompanyLogo";
import { Delta } from "@/components/widgets/parts";
import { fmtMoney, fmtCompact } from "@/lib/utils";
import type { MarketData } from "@/lib/types";

interface Row {
  company: string;
  data: MarketData | null;
  error: boolean;
}

/** A real watchlist: live quotes for every pinned company, refreshable, clickable. */
export default function WatchlistView({
  watchlist,
  onOpen,
  onUnpin,
}: {
  watchlist: string[];
  onOpen: (company: string) => void;
  onUnpin: (company: string) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const results = await Promise.all(
      watchlist.map(async (company) => {
        try {
          const res = await fetch(`/api/market?q=${encodeURIComponent(company)}`);
          const json = await res.json();
          if (!res.ok) return { company, data: null, error: true };
          return { company, data: json.data as MarketData, error: false };
        } catch {
          return { company, data: null, error: true };
        }
      })
    );
    setRows(results);
    setLoading(false);
  };

  useEffect(() => {
    if (watchlist.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on dependency change; setState happens after the awaited fetch resolves, which is the standard pattern.
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.join("|")]);

  if (watchlist.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-hover text-muted-foreground">
          <Star className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-foreground">Your watchlist is empty</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Open any company and click the star icon to pin it here for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h2 className="text-lg font-semibold">Watchlist</h2>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-hover hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background-secondary">
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Company</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">Change</th>
              <th className="px-4 py-3 text-right font-medium">Mkt Cap</th>
              <th className="px-4 py-3 text-right font-medium">P/E</th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {watchlist.map((company) => {
              const row = rows.find((r) => r.company === company);
              const m = row?.data?.metrics;
              const profile = row?.data?.profile;
              return (
                <tr
                  key={company}
                  onClick={() => onOpen(company)}
                  className="group cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-hover"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <CompanyLogo website={profile?.website} seed={m?.symbol || company} size={28} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{profile?.longName || company}</div>
                        {m?.symbol && (
                          <div className="mono text-xs text-muted-foreground">{m.symbol}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="mono px-4 py-3 text-right">
                    {m?.regularMarketPrice != null ? fmtMoney(m.regularMarketPrice, m.currency) : row?.error ? "—" : "…"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m?.regularMarketChangePercent != null ? (
                      <Delta value={m.regularMarketChangePercent} className="text-sm" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="mono px-4 py-3 text-right text-muted-foreground">
                    {m?.marketCap != null ? fmtCompact(m.marketCap, m.currency) : "—"}
                  </td>
                  <td className="mono px-4 py-3 text-right text-muted-foreground">
                    {m?.trailingPE != null ? m.trailingPE.toFixed(1) : "—"}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnpin(company);
                      }}
                      aria-label={`Remove ${company} from watchlist`}
                      className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-colors hover:bg-background hover:text-negative group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
