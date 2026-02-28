import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-[1.25rem] items-center justify-center rounded border border-line-strong bg-canvas px-1 font-mono text-2xs text-ink-muted",
        className
      )}
    >
      {children}
    </kbd>
  );
}
