import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border bg-surface-elevated/80 shadow-sm",
        className
      )}
      {...props}
    />
  );
}