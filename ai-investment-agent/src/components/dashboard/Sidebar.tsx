"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Star,
  Briefcase,
  Filter,
  Bell,
  FileText,
  Settings,
  HelpCircle,
  Terminal,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SimpleTooltip } from "@/components/ui/tooltip";

export type Section =
  | "dashboard"
  | "watchlist"
  | "portfolio"
  | "screener"
  | "alerts"
  | "reports"
  | "settings";

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "watchlist", label: "Watchlist", icon: Star },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
  { id: "screener", label: "Screener", icon: Filter },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

const STORAGE_KEY = "investorai:sidebar:collapsed";

export default function Sidebar({
  section,
  onSection,
  mobileOpen = false,
  onMobileClose,
}: {
  section: Section;
  onSection: (s: Section) => void;
  /** Controls visibility on small viewports, where the sidebar is an overlay drawer. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // One-time sync from localStorage (a browser-only external source) after
    // mount — reading it during render would mismatch the server-rendered HTML.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* localStorage unavailable */
    }
    setHydrated(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* localStorage unavailable */
      }
      return next;
    });
  };

  // Keyboard shortcut: Cmd/Ctrl + B toggles the sidebar (Linear / VS Code idiom).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Mobile backdrop — click to dismiss the drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "no-print flex shrink-0 flex-col border-r border-border bg-background-secondary transition-[width] duration-200 ease-out",
          !hydrated && "duration-0",
          // Mobile: fixed-position overlay drawer, slid off-canvas until opened,
          // always full drawer width regardless of the desktop collapsed state.
          "fixed inset-y-0 left-0 z-50 w-[260px] transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: width reflects collapsed state.
          collapsed ? "lg:w-[64px]" : "lg:w-[228px]"
        )}
      >
        {/* Logo + collapse toggle (desktop) / close (mobile) */}
        <div
          className={cn(
            "flex items-center border-b border-border/60",
            collapsed ? "h-auto flex-col items-start gap-2 px-2.5 py-2.5" : "h-14 justify-between px-4"
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
              <Terminal className="h-4 w-4" />
            </div>
            {!collapsed && (
              <span className="truncate text-[15px] font-semibold tracking-tight">InvestorAI</span>
            )}
          </div>
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            aria-label="Close sidebar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-foreground lg:hidden"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
          {/* Desktop collapse toggle */}
          <SimpleTooltip label={collapsed ? "Expand sidebar  ⌘B" : "Collapse sidebar  ⌘B"} side="right">
            <button
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-foreground lg:flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-[18px] w-[18px]" />
              ) : (
                <PanelLeftClose className="h-[18px] w-[18px]" />
              )}
            </button>
          </SimpleTooltip>
        </div>

      {/* Nav */}
      <nav className={cn("flex flex-1 flex-col gap-0.5 py-3", collapsed ? "px-2.5" : "px-3")}>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          const button = (
            <button
              key={item.id}
              onClick={() => {
                onSection(item.id);
                onMobileClose?.();
              }}
              className={cn(
                "group relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-start px-2.5" : "px-3",
                active
                  ? "bg-hover text-foreground"
                  : "text-muted-foreground hover:bg-hover/60 hover:text-foreground"
              )}
            >
              {/* Active accent rail */}
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-foreground" />
              )}
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {active && collapsed && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-positive" />
              )}
            </button>
          );
          return collapsed ? (
            <SimpleTooltip key={item.id} label={item.label} side="right">
              {button}
            </SimpleTooltip>
          ) : (
            button
          );
        })}
      </nav>

      {/* Help */}
      <div className={cn("border-t border-border py-2.5", collapsed ? "px-2.5" : "px-3")}>
        {collapsed ? (
          <SimpleTooltip label="Help" side="right">
            <button className="flex w-full items-center justify-start rounded-md py-2 text-muted-foreground transition-colors hover:bg-hover hover:text-foreground">
              <HelpCircle className="h-[18px] w-[18px] shrink-0" />
            </button>
          </SimpleTooltip>
        ) : (
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground">
            <HelpCircle className="h-[18px] w-[18px] shrink-0" />
            Help
          </button>
        )}
      </div>
    </aside>
    </>
  );
}
