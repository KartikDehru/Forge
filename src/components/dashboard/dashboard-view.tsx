"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CheckCheck, FileText, FolderKanban } from "lucide-react";
import type { Issue } from "@/types";
import { compareIssues } from "@/domain/issues";
import { notificationsFor, unreadCount } from "@/domain/activity";
import { useActiveWorkspace, useCan, useCurrentUser } from "@/hooks/use-session";
import { pluralize, formatRelativeTime } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PriorityIcon, StatusIcon } from "@/components/ui/status-icon";

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-medium tabular-nums text-ink">{value}</span>
        {hint && <span className="text-2xs text-ink-subtle">{hint}</span>}
      </dd>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel/50">
      <header className="flex h-10 items-center justify-between border-b border-line px-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function DashboardView() {
  const user = useCurrentUser();
  const workspace = useActiveWorkspace();
  const canCreate = useCan("issue.create");
  const openCreateIssue = useUiStore((s) => s.openCreateIssue);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const issues = useWorkspaceStore((s) => s.issues);
  const projects = useWorkspaceStore((s) => s.projects);
  const pages = useWorkspaceStore((s) => s.pages);
  const users = useWorkspaceStore((s) => s.users);
  const activity = useWorkspaceStore((s) => s.activity);
  const readAt = useWorkspaceStore((s) => (user ? s.notificationsReadAt[user.id] : undefined));

  const scoped = useMemo(() => issues.filter((i) => i.workspaceId === activeWorkspaceId), [issues, activeWorkspaceId]);
  const mine = useMemo<Issue[]>(
    () =>
      scoped
        .filter((i) => i.assigneeId === user?.id && i.status !== "done" && i.status !== "canceled")
        .sort(compareIssues),
    [scoped, user]
  );
  const inProgress = scoped.filter((i) => i.status === "in_progress").length;
  const inReview = scoped.filter((i) => i.status === "in_review").length;
  const unread = useMemo(
    () =>
      user
        ? unreadCount(
            notificationsFor(user.id, activity.filter((e) => e.workspaceId === activeWorkspaceId)),
            readAt
          )
        : 0,
    [user, activity, activeWorkspaceId, readAt]
  );

  const workspaceProjects = useMemo(
    () => projects.filter((p) => p.workspaceId === activeWorkspaceId),
    [projects, activeWorkspaceId]
  );
  const recentPages = useMemo(
    () =>
      pages
        .filter((p) => p.workspaceId === activeWorkspaceId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5),
    [pages, activeWorkspaceId]
  );

  const projectName = (id: string) => projects.find((p) => p.id === id);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <PageHeader
        title={`${user?.name.split(" ")[0] ?? "Your"}'s work`}
        description={`${workspace?.name ?? "Workspace"} · ${pluralize(scoped.filter((i) => i.status !== "done" && i.status !== "canceled").length, "open issue")}`}
        actions={
          canCreate ? (
            <Button variant="secondary" size="sm" onClick={() => openCreateIssue({})}>
              New issue
            </Button>
          ) : undefined
        }
      />

      <dl className="mt-5 grid grid-cols-2 divide-x divide-line overflow-hidden rounded-lg border border-line bg-panel/50 md:grid-cols-4">
        <Stat label="Assigned to you" value={mine.length} hint="open" />
        <Stat label="In progress" value={inProgress} hint="workspace" />
        <Stat label="In review" value={inReview} hint="workspace" />
        <Stat label="Unread" value={unread} hint="notifications" />
      </dl>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Panel
            title="Assigned to you"
            action={
              <Link href="/issues" className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
                Board <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            }
          >
            {mine.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  compact
                  icon={CheckCheck}
                  title="Nothing assigned to you"
                  description="When someone assigns you an issue it will show up here, ordered by priority."
                  className="border-0"
                />
              </div>
            ) : (
              <ul>
                {mine.slice(0, 8).map((issue) => (
                  <li key={issue.id} className="border-b border-line last:border-b-0">
                    <Link
                      href={`/issues/${issue.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-overlay/60"
                    >
                      <PriorityIcon priority={issue.priority} />
                      <span className="w-16 shrink-0 font-mono text-2xs text-ink-subtle">{issue.identifier}</span>
                      <StatusIcon status={issue.status} />
                      <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>
                      <span className="hidden text-2xs text-ink-subtle sm:inline">
                        {projectName(issue.projectId)?.name}
                      </span>
                      <span className="w-14 text-right text-2xs text-ink-subtle">
                        {formatRelativeTime(issue.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Projects">
            {workspaceProjects.length === 0 ? (
              <div className="p-4">
                <EmptyState compact icon={FolderKanban} title="No projects yet" className="border-0" />
              </div>
            ) : (
              <ul>
                {workspaceProjects.map((project) => {
                  const projectIssues = scoped.filter((i) => i.projectId === project.id && i.status !== "canceled");
                  const done = projectIssues.filter((i) => i.status === "done").length;
                  const pct = projectIssues.length ? Math.round((done / projectIssues.length) * 100) : 0;
                  return (
                    <li key={project.id} className="border-b border-line last:border-b-0">
                      <Link
                        href={`/projects/${project.id}`}
                        className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1.5 px-4 py-3 transition-colors hover:bg-overlay/60 sm:grid-cols-[1fr_180px_auto]"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: project.color }} aria-hidden="true" />
                          <span className="truncate text-sm font-medium">{project.name}</span>
                          <span className="font-mono text-2xs text-ink-subtle">{project.key}</span>
                        </span>
                        <span className="hidden items-center gap-2 sm:flex">
                          <span
                            role="progressbar"
                            aria-label={`${project.name} completion`}
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="h-1 flex-1 overflow-hidden rounded-sm bg-overlay"
                          >
                            <span className="block h-full bg-success" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="w-8 text-right font-mono text-2xs text-ink-subtle">{pct}%</span>
                        </span>
                        <span className="text-right text-2xs text-ink-subtle">
                          {pluralize(projectIssues.length, "issue")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel
            title="Recent activity"
            action={
              <Link href="/activity" className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
                All <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            }
          >
            <div className="p-1.5">
              <ActivityFeed limit={6} grouped={false} compact />
            </div>
          </Panel>

          <Panel title="Recently edited">
            {recentPages.length === 0 ? (
              <div className="p-4">
                <EmptyState compact icon={FileText} title="No pages yet" className="border-0" />
              </div>
            ) : (
              <ul className="p-1.5">
                {recentPages.map((page) => (
                  <li key={page.id}>
                    <Link
                      href={`/pages/${page.id}`}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-overlay"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{page.title}</span>
                      <span className="shrink-0 text-2xs text-ink-subtle">
                        {users.find((u) => u.id === page.updatedBy)?.name.split(" ")[0]} ·{" "}
                        {formatRelativeTime(page.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
