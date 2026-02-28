"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BootScreen } from "@/components/layout/boot-screen";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { CreateIssueDialog } from "@/components/issues/create-issue-dialog";
import { CreatePageDialog } from "@/components/pages/create-page-dialog";
import { ShortcutsDialog } from "@/components/layout/shortcuts-dialog";
import { Toaster } from "@/components/ui/toaster";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { useCurrentUser } from "@/hooks/use-session";
import { useAuthStore } from "@/store/auth-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { roleOf } from "@/domain";

function Authenticated({ children }: { children: React.ReactNode }) {
  useGlobalShortcuts();
  const user = useCurrentUser();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  // If the active workspace isn't one this person belongs to, fall back to one that is.
  useEffect(() => {
    if (!user) return;
    const active = workspaces.find((w) => w.id === activeWorkspaceId);
    if (active && roleOf(active, user.id)) return;
    const fallback = workspaces.find((w) => roleOf(w, user.id));
    if (fallback) setActiveWorkspace(fallback.id);
  }, [user, workspaces, activeWorkspaceId, setActiveWorkspace]);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[70] rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <div className="flex h-screen overflow-hidden bg-canvas text-ink">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto focus:outline-none">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
      <CreateIssueDialog />
      <CreatePageDialog />
      <ShortcutsDialog />
    </>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const user = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (session && !user) logout();
  }, [session, user, logout]);

  useEffect(() => {
    if (!user && !isLogin) router.replace("/login");
  }, [user, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!user) return <BootScreen label="Checking session" />;
  return <Authenticated>{children}</Authenticated>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Gate>{children}</Gate>
      <Toaster />
    </Providers>
  );
}
