"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { roleOf } from "@/domain";
import { PRODUCT_TAGLINE } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Avatar } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { StatusIcon } from "@/components/ui/status-icon";
import { Wordmark } from "@/components/brand/logo";
import type { IssueStatus } from "@/types";

const PREVIEW: { id: string; title: string; status: IssueStatus; who: string; color: string }[] = [
  { id: "PLAT-22", title: "Merge concurrent edits inside a single block", status: "in_review", who: "AC", color: "#d9883b" },
  { id: "PLAT-12", title: "Slash menu: filter as you type", status: "in_progress", who: "JL", color: "#4f9d8c" },
  { id: "PLAT-18", title: "Presence avatars flicker on reconnect", status: "todo", who: "SR", color: "#c4586a" },
];

function Preview() {
  return (
    <div aria-hidden="true" className="relative w-full max-w-md select-none">
      <div className="rounded-lg border border-line-strong bg-canvas">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="font-mono text-2xs text-ink-subtle">Platform / Product spec</span>
          <span className="ml-auto flex -space-x-1">
            {["#4f9d8c", "#c4586a"].map((c) => (
              <span key={c} className="h-4 w-4 rounded-[3px] ring-2 ring-canvas" style={{ backgroundColor: c }} />
            ))}
          </span>
        </div>
        <div className="space-y-2.5 px-4 py-4">
          <p className="text-lg font-semibold tracking-tight">Platform spec: Q1</p>
          <div className="space-y-1.5">
            <div className="h-2 w-11/12 rounded-sm bg-overlay" />
            <div className="relative h-2 w-8/12 rounded-sm bg-overlay">
              <span className="absolute -right-1 -top-1 h-4 w-0.5 bg-accent" />
              <span className="absolute -right-1 -top-4 rounded-sm bg-accent px-1 text-[9px] font-semibold leading-3 text-accent-ink">
                Alex
              </span>
            </div>
            <div className="h-2 w-10/12 rounded-sm bg-overlay" />
          </div>
        </div>
      </div>
      <ul className="-mt-px space-y-px rounded-b-lg border border-t-0 border-line-strong bg-panel">
        {PREVIEW.map((row) => (
          <li key={row.id} className="flex items-center gap-3 border-t border-line px-4 py-2.5 first:border-t-0">
            <StatusIcon status={row.status} />
            <span className="font-mono text-2xs text-ink-subtle">{row.id}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">{row.title}</span>
            <span
              className="flex h-4 w-4 items-center justify-center rounded-[3px] text-[8px] font-bold text-accent-ink"
              style={{ backgroundColor: row.color }}
            >
              {row.who}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const users = useWorkspaceStore((s) => s.users);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const session = useAuthStore((s) => s.session);
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  const choose = (userId: string) => {
    login(userId);
    router.push("/");
  };

  if (session) return null;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section
        aria-label="About Forge"
        className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-panel p-12 lg:flex"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgb(var(--line)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--line)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "linear-gradient(180deg, transparent, black 30%, black 70%, transparent)",
          }}
        />
        <Wordmark className="relative text-base" />
        <div className="relative space-y-10">
          <div className="max-w-md space-y-4">
            <h1 className="text-[2.6rem] font-semibold leading-[1.05] tracking-tight">
              Specs and issues,
              <br />
              <span className="text-accent">shaped together.</span>
            </h1>
            <p className="text-base leading-relaxed text-ink-muted">{PRODUCT_TAGLINE}</p>
          </div>
          <Preview />
        </div>
        <p className="relative text-xs text-ink-subtle">Forge · realtime docs and issue tracking</p>
      </section>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Wordmark className="text-base" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Choose who you are</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-subtle">
            Forge has no accounts or passwords yet. Pick a local identity to open the workspace. Your session and
            data stay in this browser.
          </p>

          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line-strong">
            {users.map((u) => {
              const memberships = workspaces.flatMap((w) => {
                const role = roleOf(w, u.id);
                return role ? [{ ws: w, role }] : [];
              });
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => choose(u.id)}
                    className="group flex w-full items-center gap-3 bg-panel/40 px-3.5 py-3 text-left transition-colors hover:bg-overlay"
                  >
                    <Avatar name={u.name} color={u.avatarColor} size="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{u.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {memberships.map(({ ws, role }) => (
                          <span key={ws.id} className="inline-flex items-center gap-1 text-2xs text-ink-subtle">
                            {ws.name.split(" ")[0]}
                            <RoleBadge role={role} />
                          </span>
                        ))}
                      </span>
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}
