import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-6 w-6", className)} aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#1a1815" />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="11.25" fill="none" stroke="#423c33" strokeWidth="1.5" />
      <path d="M18 14h30v9H28v8h15v9H28v10H18V14z" fill="#e9a23b" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-ink", className)}>
      <LogoMark />
      Forge
    </span>
  );
}
