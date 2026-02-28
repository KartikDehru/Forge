"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/use-session";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface Crumb {
  label: string;
  href?: string;
}

function useCrumbs(): Crumb[] {
  const pathname = usePathname();
  const projects = useWorkspaceStore((s) => s.projects);
  const pages = useWorkspaceStore((s) => s.pages);
  const issues = useWorkspaceStore((s) => s.issues);

  return useMemo(() => {
    const [section, id] = pathname.split("/").filter(Boolean);
    switch (section) {
      case undefined:
        return [{ label: "Dashboard" }];
      case "issues": {
        if (!id) return [{ label: "Issues" }];
        const issue = issues.find((i) => i.id === id);
        return [{ label: "Issues", href: "/issues" }, { label: issue?.identifier ?? "Issue" }];
      }
      case "projects": {
        const project = projects.find((p) => p.id === id);
        return [{ label: "Projects" }, { label: project?.name ?? "Project" }];
      }
      case "pages": {
        const page = pages.find((p) => p.id === id);
        const project = projects.find((p) => p.id === page?.projectId);
        return [
          { label: project?.name ?? "Pages", href: project ? `/projects/${project.id}` : undefined },
          { label: page?.title ?? "Page" },
        ];
      }
      case "activity":
        return [{ label: "Activity" }];
      case "settings":
        return [{ label: "Settings" }];
      default:
        return [{ label: "Forge" }];
    }
  }, [pathname, projects, pages, issues]);
}

export function Topbar() {
  const crumbs = useCrumbs();
  const canCreate = useCan("issue.create");
  const openCreateIssue = useUiStore((s) => s.openCreateIssue);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-line bg-canvas px-4">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-ink-subtle" aria-hidden="true">/</span>}
                {crumb.href && !last ? (
                  <Link href={crumb.href} className="text-ink-muted transition-colors hover:text-ink">
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? "page" : undefined}
                    className={last ? "font-medium text-ink" : "text-ink-muted"}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="flex items-center gap-2">
        {canCreate && (
          <Button size="sm" onClick={() => openCreateIssue({ projectId: activeProjectId })} aria-keyshortcuts="c">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New issue
            <Kbd className="border-accent-ink/30 bg-transparent text-accent-ink/70">C</Kbd>
          </Button>
        )}
        <NotificationBell />
      </div>
    </header>
  );
}
