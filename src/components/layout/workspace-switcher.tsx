"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { roleOf } from "@/domain";
import { useDismiss } from "@/hooks/use-dismiss";
import { useActiveWorkspace, useCurrentUser } from "@/hooks/use-session";
import { useWorkspaceStore } from "@/store/workspace-store";
import { RoleBadge } from "@/components/ui/role-badge";

export function WorkspaceMonogram({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded bg-accent font-semibold text-accent-ink text-xs",
        className
      )}
    >
      {name.trim()[0]?.toUpperCase() ?? "F"}
    </span>
  );
}

export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const user = useCurrentUser();
  const active = useActiveWorkspace();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  const mine = useMemo(
    () => (user ? workspaces.filter((w) => roleOf(w, user.id)) : []),
    [workspaces, user]
  );

  if (!active || !user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Workspace: ${active.name}. Switch workspace`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-overlay",
          collapsed && "justify-center"
        )}
      >
        <WorkspaceMonogram name={active.name} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{active.name}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Workspaces"
          className="absolute left-0 top-full z-40 mt-1 w-60 animate-pop-in rounded-lg border border-line-strong bg-raised p-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.8)]"
        >
          <p className="section-label px-2 py-1.5">Workspaces</p>
          {mine.map((ws) => {
            const role = roleOf(ws, user.id)!;
            return (
              <button
                key={ws.id}
                role="menuitemradio"
                aria-checked={ws.id === active.id}
                type="button"
                onClick={() => {
                  setActiveWorkspace(ws.id);
                  setOpen(false);
                  router.push("/");
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-ink hover:bg-overlay"
              >
                <WorkspaceMonogram name={ws.name} className="h-5 w-5 text-2xs" />
                <span className="min-w-0 flex-1 truncate">{ws.name}</span>
                <RoleBadge role={role} />
                {ws.id === active.id && <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
