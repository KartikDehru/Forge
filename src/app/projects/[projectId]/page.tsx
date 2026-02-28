"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { FilePlus2, FileText } from "lucide-react";
import { useCan, useRole } from "@/hooks/use-session";
import { formatRelativeTime, pluralize } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { IssueBoard } from "@/components/issues/issue-board";
import { MissingState, NoAccessState } from "@/components/layout/state-views";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  const project = useWorkspaceStore((s) => s.projects.find((p) => p.id === params.projectId));
  const allPages = useWorkspaceStore((s) => s.pages);
  const issues = useWorkspaceStore((s) => s.issues);
  const users = useWorkspaceStore((s) => s.users);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const openCreatePage = useUiStore((s) => s.openCreatePage);
  const role = useRole(project?.workspaceId);
  const canCreatePage = useCan("page.create", project?.workspaceId);

  useEffect(() => {
    if (project && role) setActiveProject(project.id);
  }, [project, role, setActiveProject]);

  const pages = useMemo(
    () =>
      allPages
        .filter((p) => p.projectId === params.projectId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [allPages, params.projectId]
  );
  const issueCount = useMemo(
    () => issues.filter((i) => i.projectId === params.projectId).length,
    [issues, params.projectId]
  );

  if (!project) return <MissingState what="project" />;
  if (!role) return <NoAccessState what="project" />;

  return (
    <div>
      <section className="border-b border-line px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: project.color }} aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
              <span className="font-mono text-xs text-ink-subtle">{project.key}</span>
            </div>
            <p className="mt-1.5 max-w-xl text-sm text-ink-muted">{project.description}</p>
          </div>
          <p className="shrink-0 text-xs text-ink-subtle">
            {pluralize(pages.length, "page")} · {pluralize(issueCount, "issue")}
          </p>
        </div>
      </section>

      <section aria-labelledby="project-pages" className="mx-auto max-w-6xl px-6 py-5">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 id="project-pages" className="text-sm font-semibold">
            Pages
          </h2>
          {canCreatePage && (
            <Button size="sm" variant="secondary" onClick={() => openCreatePage(project.id)}>
              <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
              New page
            </Button>
          )}
        </div>
        {pages.length === 0 ? (
          <EmptyState
            compact
            icon={FileText}
            title="No pages yet"
            description="Pages hold specs, notes and decisions next to the issues they drive."
            action={
              canCreatePage ? (
                <Button size="sm" onClick={() => openCreatePage(project.id)}>
                  Create the first page
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-line">
            {pages.map((page) => (
              <li key={page.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/pages/${page.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-overlay/60"
                >
                  <FileText className="h-3.5 w-3.5 text-ink-subtle" aria-hidden="true" />
                  <span className="flex-1 truncate font-medium">{page.title}</span>
                  <span className="text-xs text-ink-subtle">
                    {users.find((u) => u.id === page.updatedBy)?.name} · {formatRelativeTime(page.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="project-issues" className="border-t border-line">
        <h2 id="project-issues" className="sr-only">
          Issues
        </h2>
        <div className="h-[34rem]">
          <IssueBoard projectId={project.id} embedded />
        </div>
      </section>
    </div>
  );
}
