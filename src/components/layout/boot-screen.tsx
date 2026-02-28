import { LogoMark } from "@/components/brand/logo";

export function BootScreen({ label = "Opening workspace" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-screen flex-col items-center justify-center gap-4 bg-canvas"
    >
      <LogoMark className="h-10 w-10 animate-pulse" />
      <p className="text-xs text-ink-subtle">{label}…</p>
    </div>
  );
}
