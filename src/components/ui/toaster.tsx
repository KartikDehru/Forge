"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore, type Toast } from "@/store/ui-store";

const icons = { error: AlertTriangle, success: CheckCircle2, info: Info };
const tones = {
  error: "text-danger",
  success: "text-success",
  info: "text-info",
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useUiStore((s) => s.dismissToast);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.tone === "error" ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [dismiss, toast.id, toast.tone]);

  const Icon = icons[toast.tone];
  return (
    <li
      className="flex w-80 animate-toast-in items-start gap-2.5 rounded-lg border border-line-strong bg-raised px-3 py-2.5 text-sm shadow-[0_12px_32px_-12px_rgba(0,0,0,0.7)]"
      role={toast.tone === "error" ? "alert" : "status"}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tones[toast.tone])} aria-hidden="true" />
      <p className="flex-1 text-ink">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="rounded p-0.5 text-ink-subtle hover:text-ink"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </li>
  );
}

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  return (
    <ul
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2 [&>li]:pointer-events-auto"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ul>
  );
}
