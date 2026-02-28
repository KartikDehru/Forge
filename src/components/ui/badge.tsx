import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-line bg-raised px-1.5 py-px text-2xs font-medium text-ink-muted",
        className
      )}
      {...props}
    />
  );
}
