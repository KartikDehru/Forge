"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  Activity,
  ChevronsLeft,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCan, useCurrentUser, useRole } from "@/hooks/use-session";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Avatar } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { RoleBadge } from "@/components/ui/role-badge";
import { Wordmark, LogoMark } from "@/components/brand/logo";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, keys: "G D" },
  { href: "/issues", label: "Issues", icon: KanbanSquare, keys: "G I" },
  { href: "/activity", label: "Activity", icon: Activity, keys: "G A" },
  { href: "/settings", label: "Settings", icon: Settings, keys: "G S" },
] as const;

const itemBase =
  "group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-100";
const itemIdle = "text-ink-muted hover:bg-overlay hover:text-ink";
const itemActive = "bg-overlay text-ink";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const setPalette = useUiStore((s) => s.setCommandPaletteOpen);
  const openCreatePage = useUiStore((s) => s.openCreatePage);
  const user = useCurrentUser();
  const role = useRole();
  const canCreatePage = useCan("page.create");
  const logout = useAuthStore((s) => s.logout);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const projects = useWorkspaceStore((s) => s.projects);
  const pages = useWorkspaceStore((s) => s.pages);

  const projectList = useMemo(
    () => projects.filter((p) => p.workspaceId === activeWorkspaceId),
    [projects, activeWorkspaceId]
  );
  const activeProject = projectList.find((p) => p.id === activeProjectId) ?? projectList[0];
  const pageList = useMemo(
    () =>
      pages
        .filter((p) => p.projectId === activeProject?.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [pages, activeProject]
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      aria-label="Primary"
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-line bg-panel transition-[width] duration-200 ease-forge",
        collapsed ? "w-[52px]" : "w-60"
      )}
    >
      <div className={cn("flex h-11 items-center border-b border-line px-2", collapsed ? "justify-center" : "justify-between")}>
        {collapsed ? <LogoMark /> : <Wordmark className="px-1 text-sm" />}
        {!collapsed && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Collapse sidebar"
            aria-expanded={!collapsed}
            className="rounded p-1 text-ink-subtle transition-colors hover:bg-overlay hover:text-ink"
          >
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="space-y-1 px-2 pt-2">
        <WorkspaceSwitcher collapsed={collapsed} />
        <button
          type="button"
          onClick={() => setPalette(true)}
          aria-label="Search and commands"
          aria-keyshortcuts="Control+K Meta+K"
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-md border border-line bg-canvas px-2 text-sm text-ink-subtle transition-colors hover:border-line-strong hover:text-ink-muted",
            collapsed && "justify-center px-0"
          )}
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search</span>
              <Kbd>⌘K</Kbd>
            </>
          )}
        </button>
      </div>

      <nav aria-label="Main" className="mt-2 flex flex-col gap-0.5 px-2">
        {NAV.map(({ href, label, icon: Icon, keys }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? label : undefined}
              title={collapsed ? `${label} (${keys})` : undefined}
              className={cn(itemBase, active ? itemActive : itemIdle, collapsed && "justify-center px-0")}
            >
              {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-[1px] bg-accent" aria-hidden="true" />}
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  <span className="font-mono text-2xs text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100">
                    {keys}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {collapsed ? (
        <div className="mt-auto" />
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-3">
          <section aria-labelledby="sb-projects">
            <h2 id="sb-projects" className="section-label px-2 pb-1">
              Projects
            </h2>
            <ul className="space-y-0.5">
              {projectList.map((p) => {
                const active = isActive(`/projects/${p.id}`);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(itemBase, active ? itemActive : itemIdle)}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: p.color }}
                        aria-hidden="true"
                      />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="font-mono text-2xs text-ink-subtle">{p.key}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="sb-pages">
            <div className="flex items-center justify-between px-2 pb-1">
              <h2 id="sb-pages" className="section-label truncate">
                Pages{activeProject ? ` · ${activeProject.name}` : ""}
              </h2>
              {canCreatePage && activeProject && (
                <button
                  type="button"
                  onClick={() => openCreatePage(activeProject.id)}
                  aria-label="Create page"
                  title="Create page"
                  className="rounded p-0.5 text-ink-subtle transition-colors hover:bg-overlay hover:text-ink"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            {pageList.length === 0 ? (
              <p className="px-2 py-1 text-xs text-ink-subtle">No pages in this project yet.</p>
            ) : (
              <ul className="space-y-0.5">
                {pageList.map((page) => {
                  const active = pathname === `/pages/${page.id}`;
                  return (
                    <li key={page.id}>
                      <Link
                        href={`/pages/${page.id}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(itemBase, active ? itemActive : itemIdle)}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{page.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {collapsed && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Expand sidebar"
          aria-expanded={false}
          className="mx-2 mb-2 flex h-7 items-center justify-center rounded text-ink-subtle transition-colors hover:bg-overlay hover:text-ink"
        >
          <ChevronsLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
        </button>
      )}

      <div className="border-t border-line p-2">
        {user && (
          <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
            <Avatar name={user.name} color={user.avatarColor} size="md" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink">{user.name}</p>
                {role && <RoleBadge role={role} className="mt-0.5" />}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              aria-label="Sign out"
              title="Sign out"
              className="rounded p-1.5 text-ink-subtle transition-colors hover:bg-overlay hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
