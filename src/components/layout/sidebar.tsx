"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  KanbanSquare,
  ChevronLeft,
  LogOut,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useAuthStore } from "@/store/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/issues", label: "Issues", icon: KanbanSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const setPalette = useUiStore((s) => s.setCommandPaletteOpen);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWs = useWorkspaceStore((s) => s.activeWorkspaceId);
  const projects = useWorkspaceStore((s) => s.projects);
  const pages = useWorkspaceStore((s) => s.pages);
  const activeProject = useWorkspaceStore((s) => s.activeProjectId);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const ws = workspaces.find((w) => w.id === activeWs);
  const projectList = projects.filter((p) => p.workspaceId === activeWs);
  const pageList = pages.filter((p) => p.projectId === activeProject);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-surface-border bg-surface transition-all",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      <div className="flex items-center justify-between border-b border-surface-border p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-lg">{ws?.icon ?? "◆"}</span>
            <div>
              <p className="text-sm font-semibold text-zinc-100">{ws?.name}</p>
              <p className="text-xs text-zinc-500">Workspace</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg p-2 text-zinc-400 hover:bg-surface-elevated hover:text-zinc-200"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn("h-4 w-4 transition", collapsed && "rotate-180")} />
        </button>
      </div>

      <div className="p-2">
        <Button
          variant="secondary"
          className="w-full justify-start gap-2"
          onClick={() => setPalette(true)}
        >
          <Search className="h-4 w-4" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search</span>
              <kbd className="text-[10px] text-zinc-500">⌘K</kbd>
            </>
          )}
        </Button>
      </div>

      <nav className="flex flex-col gap-1 px-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-400 hover:bg-surface-elevated hover:text-zinc-100",
                active && "bg-surface-elevated text-zinc-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mt-4 flex-1 overflow-y-auto px-2 pb-4">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Projects
          </p>
          <ul className="space-y-1">
            {projectList.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-400 hover:bg-surface-elevated hover:text-zinc-100"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mb-2 mt-4 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Pages
          </p>
          <ul className="space-y-1">
            {pageList.map((page) => (
              <li key={page.id}>
                <Link
                  href={`/pages/${page.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-400 hover:bg-surface-elevated hover:text-zinc-100"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{page.icon}</span>
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto border-t border-surface-border p-3">
        {user ? (
          <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
            <Avatar name={user.name} color={user.avatarColor} size="sm" online />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-200">{user.name}</p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={logout}
                className="rounded p-1 text-zinc-500 hover:text-zinc-300"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          !collapsed && <p className="text-xs text-zinc-500">Not signed in</p>
        )}
      </div>
    </aside>
  );
}