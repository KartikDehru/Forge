"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-muted",
  secondary:
    "bg-surface-elevated border border-surface-border text-zinc-100 hover:bg-zinc-800",
  ghost: "text-zinc-300 hover:bg-surface-elevated",
  danger: "bg-red-600/90 text-white hover:bg-red-600",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}