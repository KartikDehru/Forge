import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "neutral" | "danger";
  compact?: boolean;
  className?: string;
}

/** Shared empty / error layout: ruled frame, line icon, one clear next step. */
export function EmptyState({ icon: Icon, title, description, action, tone = "neutral", compact, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        className
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md border",
          tone === "danger"
            ? "border-danger/40 bg-danger/10 text-danger"
            : "border-line-strong bg-raised text-ink-muted"
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="max-w-xs space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="text-xs leading-relaxed text-ink-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}
