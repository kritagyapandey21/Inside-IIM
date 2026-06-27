"use client";

import { AlertTriangle, Inbox, Loader2, RotateCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function WidgetLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-1">
      <Skeleton className="h-8 w-2/5" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function WidgetEmpty({ label = "No data available" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[100px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <Inbox className="h-5 w-5 opacity-60" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

export function WidgetError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-full min-h-[100px] flex-col items-center justify-center gap-2.5 px-4 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--negative-bg)]">
        <AlertTriangle className="h-4 w-4 text-negative" />
      </div>
      <span className="max-w-[220px] text-xs leading-relaxed text-muted-foreground">
        {message || "Couldn't load this widget."}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-0.5 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-hover"
        >
          <RotateCw className="h-3 w-3" /> Retry
        </button>
      )}
    </div>
  );
}

export function WidgetSpinner({ label }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[100px] flex-col items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label && <span className="text-xs">{label}</span>}
    </div>
  );
}

/** Standard scrollable widget body region. */
export function WidgetBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("h-full min-h-0 overflow-auto", className)}>{children}</div>
  );
}
