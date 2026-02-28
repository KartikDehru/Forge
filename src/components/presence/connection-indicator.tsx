"use client";

import type { ConnectionStatus } from "@/lib/collab/transport";
import { cn } from "@/lib/utils";

const COPY: Record<ConnectionStatus, { label: string; dot: string; text: string }> = {
  connected: { label: "Live", dot: "bg-success", text: "text-ink-muted" },
  connecting: { label: "Connecting", dot: "bg-accent animate-pulse", text: "text-ink-muted" },
  reconnecting: { label: "Reconnecting", dot: "bg-accent animate-pulse", text: "text-accent" },
  offline: { label: "Offline", dot: "bg-danger", text: "text-danger" },
};

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  onRetry?: () => void;
  className?: string;
}

export function ConnectionIndicator({ status, onRetry, className }: ConnectionIndicatorProps) {
  const copy = COPY[status];
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-1.5 text-xs", copy.text, className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-[2px]", copy.dot)} aria-hidden="true" />
      {copy.label}
      {status === "offline" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-0.5 rounded px-1 text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          Retry
        </button>
      )}
    </span>
  );
}
