"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { KanbanSquare, SearchX } from "lucide-react";
import type { IssueStatus } from "@/types";
import { ALL_STATUSES, EMPTY_FILTERS, filterIssues, groupByStatus, hasActiveFilters, statusLabel, type IssueFilters } from "@/domain/issues";
import { useCan, useCurrentUser, useMembers } from "@/hooks/use-session";
import { isTypingTarget } from "@/hooks/use-global-shortcuts";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IssueColumn } from "@/components/issues/issue-column";
import { IssueFilterBar } from "@/components/issues/issue-filters";
import { PresenceBar } from "@/components/presence/presence-bar";

interface IssueBoardProps {
  projectId: string;
  /** Hides the page-level header when embedded in another page. */
  embedded?: boolean;
}

export function IssueBoard({ projectId, embedded }: IssueBoardProps) {
  const user = useCurrentUser();
  const project = useWorkspaceStore((s) => s.projects.find((p) => p.id === projectId));
  const allIssues = useWorkspaceStore((s) => s.issues);
  const allLabels = useWorkspaceStore((s) => s.labels);
  const allUsers = useWorkspaceStore((s) => s.users);
  const transitionIssue = useWorkspaceStore((s) => s.transitionIssue);
  const openCreateIssue = useUiStore((s) => s.openCreateIssue);
  const toast = useUiStore((s) => s.toast);
  const toastError = useUiStore((s) => s.toastError);
  const canMove = useCan("issue.transition", project?.workspaceId);
  const canCreate = useCan("issue.create", project?.workspaceId);
  const members = useMembers(project?.workspaceId);

  const [filters, setFilters] = useState<IssueFilters>(EMPTY_FILTERS);
  const [dragging, setDragging] = useState<{ id: string; from: IssueStatus } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // `/` focuses search, unless the user is already typing or a dialog is open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const projectIssues = useMemo(
    () => allIssues.filter((i) => i.projectId === projectId),
    [allIssues, projectId]
  );
  const labels = useMemo(
    () => allLabels.filter((l) => l.workspaceId === project?.workspaceId),
    [allLabels, project?.workspaceId]
  );
  const visible = useMemo(() => filterIssues(projectIssues, filters), [projectIssues, filters]);
  const grouped = useMemo(() => groupByStatus(visible), [visible]);
  const memberUsers = useMemo(() => members.map((m) => m.user), [members]);

  const move = (issueId: string, to: IssueStatus) => {
    if (!user) return;
    const issue = allIssues.find((i) => i.id === issueId);
    if (!issue || issue.status === to) return;
    const result = transitionIssue(user.id, issueId, to);
    if (!result.ok) toastError(result.error);
    else toast("success", `${issue.identifier} moved to ${statusLabel(to)}`);
  };

  const filtered = hasActiveFilters(filters);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 px-5 pb-3 pt-4">
        {!embedded && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {project && (
                <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: project.color }} aria-hidden="true" />
              )}
              <h1 className="text-base font-semibold">{project?.name ?? "Issues"}</h1>
              {project && <span className="font-mono text-xs text-ink-subtle">{project.key}</span>}
            </div>
            <PresenceBar roomId={`project:${projectId}:issues`} />
          </div>
        )}
        <IssueFilterBar
          ref={searchRef}
          filters={filters}
          onChange={setFilters}
          users={allUsers.filter((u) => memberUsers.some((m) => m.id === u.id))}
          labels={labels}
          total={projectIssues.length}
          shown={visible.length}
        />
      </div>

      {projectIssues.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            icon={KanbanSquare}
            title="No issues in this project"
            description="Create the first issue to start tracking work. Press C anywhere to open the form."
            action={
              canCreate ? (
                <Button size="sm" onClick={() => openCreateIssue({ projectId })}>
                  Create issue
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            icon={SearchX}
            title="No issues match these filters"
            description="Try a different search term or clear a filter."
            action={
              filtered ? (
                <Button size="sm" variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-2.5 overflow-x-auto px-5 pb-5">
          {ALL_STATUSES.map((status, index) => (
            <IssueColumn
              key={status}
              status={status}
              index={index}
              issues={grouped[status]}
              users={allUsers}
              labels={labels}
              canMove={canMove}
              canCreate={canCreate}
              draggingFrom={dragging?.from ?? null}
              draggingId={dragging?.id ?? null}
              onDragStart={(id) => {
                const issue = allIssues.find((i) => i.id === id);
                if (issue) setDragging({ id, from: issue.status });
              }}
              onDragEnd={() => setDragging(null)}
              onDrop={(id, to) => {
                setDragging(null);
                move(id, to);
              }}
              onMove={move}
              onCreate={(s) => openCreateIssue({ projectId, status: s })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
