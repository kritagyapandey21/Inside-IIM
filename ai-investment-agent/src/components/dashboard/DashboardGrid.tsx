"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";
import WidgetShell from "./WidgetShell";
import { WIDGET_COMPONENTS } from "@/lib/dashboard/widgetRegistry";
import { WIDGET_META } from "@/lib/dashboard/widgetMeta";
import { useDashboardData } from "@/lib/dashboard/DashboardContext";
import type { DashboardStore } from "@/lib/dashboard/useDashboardStore";

/** Base row height (px). A widget of h:6 ≈ 6 * 40 = 240px tall. Slightly
 *  shorter rows tighten vertical rhythm so widgets hug their content instead
 *  of stretching into dead space. */
const ROW_H = 40;
const GAP = 14;

/** Responsive column count derived from the live container width. */
function columnsFor(width: number): number {
  if (width >= 1280) return 12;
  if (width >= 960) return 8;
  if (width >= 620) return 4;
  return 1;
}

/** Measure the grid container and expose a responsive column count. */
function useColumns(ref: React.RefObject<HTMLDivElement | null>) {
  const [cols, setCols] = useState(12);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setCols(columnsFor(el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return cols;
}

export default function DashboardGrid({
  store,
  tab = "overview",
}: {
  store: DashboardStore;
  tab?: string;
}) {
  const { refreshMarket } = useDashboardData();
  const containerRef = useRef<HTMLDivElement>(null);
  const cols = useColumns(containerRef);

  const dragId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Filter widgets to the active tab ("overview" shows everything).
  const visibleWidgets = useMemo(() => {
    if (tab === "overview") return store.widgets;
    return store.widgets.filter((w) => WIDGET_META[w.type]?.tabs.includes(tab));
  }, [store.widgets, tab]);

  const handleDragEnter = useCallback(
    (overId: string) => {
      const from = dragId.current;
      if (from && from !== overId) store.reorderWidget(from, overId);
    },
    [store]
  );

  if (visibleWidgets.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-hover text-muted-foreground">
          <LayoutGrid className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-foreground">No widgets on this tab</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Switch to Overview to see the full dashboard, or add a widget to this view.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="p-4"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: cols === 1 ? "minmax(0, auto)" : `${ROW_H}px`,
        gridAutoFlow: "row dense",
        gap: GAP,
      }}
    >
      <AnimatePresence mode="popLayout">
        {visibleWidgets.map((w) => {
          const meta = WIDGET_META[w.type];
          const Body = WIDGET_COMPONENTS[w.type];
          const wSpan = Math.min(w.w ?? meta.w, cols);
          const hSpan = w.h ?? meta.h;
          const isDragging = draggingId === w.id;

          return (
            <motion.div
              key={w.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: isDragging ? 0.55 : 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ layout: { duration: 0.28, ease: [0.2, 0, 0, 1] }, duration: 0.2 }}
              style={{
                gridColumn: `span ${wSpan}`,
                gridRow: cols === 1 ? "auto" : `span ${w.collapsed ? 1 : hSpan}`,
                minHeight: cols === 1 && !w.collapsed ? Math.max(220, hSpan * 34) : 0,
                // Grid items default to align-self: stretch, but nothing stops
                // their content from growing taller than the track and
                // visually bleeding into the row below (the overlap bug). Pin
                // the cell to exactly its track height and clip overflow so a
                // widget's content can never escape its own card bounds.
                height: cols === 1 ? undefined : "100%",
                overflow: "hidden",
                cursor: store.editMode ? "grab" : "default",
              }}
              draggable={store.editMode}
              onDragStart={() => {
                dragId.current = w.id;
                setDraggingId(w.id);
              }}
              onDragEnter={() => handleDragEnter(w.id)}
              onDragOver={(e) => store.editMode && e.preventDefault()}
              onDragEnd={() => {
                dragId.current = null;
                setDraggingId(null);
              }}
            >
              <WidgetShell
                instance={w}
                meta={meta}
                editMode={store.editMode}
                onRefresh={meta.source === "market" ? () => refreshMarket() : undefined}
                onRemove={store.removeWidget}
                onDuplicate={store.duplicateWidget}
                onToggleCollapse={store.toggleCollapse}
                onTogglePin={store.togglePin}
                onCycleSize={store.cycleSize}
              >
                <Body />
              </WidgetShell>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
