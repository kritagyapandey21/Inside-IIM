"use client";

import { useState } from "react";
import {
  GripVertical,
  MoreHorizontal,
  Maximize2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Pin,
  PinOff,
  Scaling,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WidgetInstance, WidgetMeta } from "@/lib/dashboard/types";

interface WidgetShellProps {
  instance: WidgetInstance;
  meta: WidgetMeta;
  editMode: boolean;
  subtitle?: React.ReactNode;
  /** Optional header-right slot (e.g. range selector). */
  headerExtra?: React.ReactNode;
  onRefresh?: () => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onTogglePin: (id: string) => void;
  onCycleSize?: (id: string) => void;
  children: React.ReactNode;
}

export default function WidgetShell({
  instance,
  meta,
  editMode,
  subtitle,
  headerExtra,
  onRefresh,
  onRemove,
  onDuplicate,
  onToggleCollapse,
  onTogglePin,
  onCycleSize,
  children,
}: WidgetShellProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const collapsed = !!instance.collapsed;

  const body = (
    <div className="widget-body min-h-0 flex-1 overflow-auto px-4 pb-4 pt-2">
      {children}
    </div>
  );

  return (
    <div
      className={cn(
        "group/widget flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-all duration-150",
        "hover:border-border-strong hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]",
        editMode
          ? "border-dashed border-border-strong"
          : "border-border"
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 px-4 py-3">
        {editMode && (
          <span className="widget-drag-handle -ml-1 text-muted-foreground/60 hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold leading-tight">
              {meta.title}
            </h3>
            {instance.pinned && (
              <Pin className="h-3 w-3 shrink-0 text-warning" fill="currentColor" />
            )}
          </div>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Toolbar — appears on hover (always in edit mode) */}
        <div
          className={cn(
            "widget-toolbar flex items-center gap-0.5 opacity-0 transition-opacity group-hover/widget:opacity-100",
            editMode && "opacity-100"
          )}
        >
          {headerExtra}
          {editMode && onCycleSize && (
            <SimpleTooltip label="Resize">
              <button
                onClick={() => onCycleSize(instance.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground"
              >
                <Scaling className="h-3.5 w-3.5" />
              </button>
            </SimpleTooltip>
          )}
          {onRefresh && (
            <SimpleTooltip label="Refresh">
              <button
                onClick={onRefresh}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </SimpleTooltip>
          )}
          <SimpleTooltip label={collapsed ? "Expand" : "Collapse"}>
            <button
              onClick={() => onToggleCollapse(instance.id)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground"
            >
              {collapsed ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </button>
          </SimpleTooltip>
          <SimpleTooltip label="Fullscreen">
            <button
              onClick={() => setFullscreen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </SimpleTooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFullscreen(true)}>
                <Maximize2 /> Fullscreen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleCollapse(instance.id)}>
                {collapsed ? <ChevronDown /> : <ChevronUp />}
                {collapsed ? "Expand" : "Collapse"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePin(instance.id)}>
                {instance.pinned ? <PinOff /> : <Pin />}
                {instance.pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              {onCycleSize && (
                <DropdownMenuItem onClick={() => onCycleSize(instance.id)}>
                  <Scaling /> Resize
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDuplicate(instance.id)}>
                <Copy /> Duplicate
              </DropdownMenuItem>
              {onRefresh && (
                <DropdownMenuItem onClick={onRefresh}>
                  <RefreshCw /> Refresh
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onRemove(instance.id)}
              >
                <X /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!collapsed && body}

      {/* Fullscreen view — sizes to a comfortable, content-led height rather
          than a cavernous fixed 85vh that left charts floating in dead space. */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="flex max-h-[88vh] w-[90vw] max-w-[1000px] flex-col gap-0 overflow-hidden p-0">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
            <DialogTitle>{meta.title}</DialogTitle>
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
          <div className="relative h-[420px] shrink-0 overflow-auto p-5">
            <div className="h-full">{children}</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
