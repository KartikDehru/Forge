"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Issue, IssuePriority, IssueStatus } from "@/types";
import { PRIORITIES, allowedTransitions, TITLE_MAX } from "@/domain/issues";
import { useCan, useCurrentUser, useMembers } from "@/hooks/use-session";
import { ISSUE_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { CommentThread } from "@/components/comments/comment-thread";
import { PresenceBar } from "@/components/presence/presence-bar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select, Textarea } from "@/components/ui/input";
import { PriorityIcon, StatusIcon } from "@/components/ui/status-icon";

function Property({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-center gap-2">
      <label htmlFor={htmlFor} className="text-xs text-ink-subtle">
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function IssueDetail({ issue }: { issue: Issue }) {
  const router = useRouter();
  const user = useCurrentUser();
  const project = useWorkspaceStore((s) => s.projects.find((p) => p.id === issue.projectId));
  const allLabels = useWorkspaceStore((s) => s.labels);
  const allUsers = useWorkspaceStore((s) => s.users);
  const updateIssue = useWorkspaceStore((s) => s.updateIssue);
  const transitionIssue = useWorkspaceStore((s) => s.transitionIssue);
  const deleteIssue = useWorkspaceStore((s) => s.deleteIssue);
  const toast = useUiStore((s) => s.toast);
  const toastError = useUiStore((s) => s.toastError);
  const canEdit = useCan("issue.update", issue.workspaceId);
  const canMove = useCan("issue.transition", issue.workspaceId);
  const canDelete = useCan("issue.delete", issue.workspaceId);
  const members = useMembers(issue.workspaceId);

  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Pull in remote/store changes unless the field is being edited right now.
  useEffect(() => {
    if (document.activeElement !== titleRef.current) setTitle(issue.title);
  }, [issue.title]);
  useEffect(() => {
    if (document.activeElement !== descRef.current) setDescription(issue.description);
  }, [issue.description]);

  const labels = useMemo(
    () => allLabels.filter((l) => l.workspaceId === issue.workspaceId),
    [allLabels, issue.workspaceId]
  );
  const assignee = allUsers.find((u) => u.id === issue.assigneeId);
  const creator = allUsers.find((u) => u.id === issue.createdBy);
  const statusOptions = useMemo<IssueStatus[]>(
    () => [issue.status, ...allowedTransitions(issue.status)],
    [issue.status]
  );

  const patch = (change: Parameters<typeof updateIssue>[2], revert?: () => void) => {
    if (!user) return;
    const result = updateIssue(user.id, issue.id, change);
    if (!result.ok) {
      toastError(result.error);
      revert?.();
    }
  };

  const changeStatus = (to: IssueStatus) => {
    if (!user) return;
    const result = transitionIssue(user.id, issue.id, to);
    if (!result.ok) toastError(result.error);
  };

  const commitTitle = () => {
    const next = title.trim();
    if (next === issue.title) return setTitle(issue.title);
    patch({ title: next }, () => setTitle(issue.title));
  };

  const remove = () => {
    if (!user) return;
    const result = deleteIssue(user.id, issue.id);
    if (!result.ok) {
      toastError(result.error);
      setConfirmDelete(false);
      return;
    }
    toast("success", `Deleted ${issue.identifier}`);
    router.replace("/issues");
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-10 gap-y-8 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <header className="mb-5">
          <div className="mb-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              {project && (
                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                  <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: project.color }} aria-hidden="true" />
                  {project.name}
                </span>
              )}
              <span className="font-mono text-ink-subtle">{issue.identifier}</span>
            </div>
            <PresenceBar roomId={`issue:${issue.id}`} />
          </div>
          <label htmlFor="issue-title" className="sr-only">
            Issue title
          </label>
          <input
            id="issue-title"
            ref={titleRef}
            value={title}
            readOnly={!canEdit}
            maxLength={TITLE_MAX + 20}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setTitle(issue.title);
                e.currentTarget.blur();
              }
            }}
            className="w-full rounded-md bg-transparent px-1 py-0.5 -mx-1 text-2xl font-semibold leading-tight tracking-tight text-ink hover:bg-raised/60 focus-visible:bg-raised focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          />
        </header>

        <div className="mb-8">
          <label htmlFor="issue-description" className="section-label mb-1.5 block">
            Description
          </label>
          <Textarea
            id="issue-description"
            ref={descRef}
            rows={6}
            value={description}
            readOnly={!canEdit}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== issue.description) patch({ description }, () => setDescription(issue.description));
            }}
            placeholder={canEdit ? "Add context, acceptance criteria, links" : "No description"}
          />
        </div>

        <CommentThread entityType="issue" entityId={issue.id} workspaceId={issue.workspaceId} />
      </div>

      <aside aria-label="Issue properties" className="h-fit space-y-3.5 rounded-lg border border-line bg-panel p-4">
        <Property label="Status" htmlFor="prop-status">
          <div className="flex items-center gap-2">
            <StatusIcon status={issue.status} />
            <Select
              id="prop-status"
              value={issue.status}
              disabled={!canMove}
              onChange={(e) => changeStatus(e.target.value as IssueStatus)}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {ISSUE_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
        </Property>

        <Property label="Priority" htmlFor="prop-priority">
          <div className="flex items-center gap-2">
            <PriorityIcon priority={issue.priority} />
            <Select
              id="prop-priority"
              value={issue.priority}
              disabled={!canEdit}
              onChange={(e) => patch({ priority: e.target.value as IssuePriority })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          </div>
        </Property>

        <Property label="Assignee" htmlFor="prop-assignee">
          <div className="flex items-center gap-2">
            {assignee ? (
              <Avatar name={assignee.name} color={assignee.avatarColor} size="sm" />
            ) : (
              <span className="h-5 w-5 shrink-0 rounded border border-dashed border-line-strong" aria-hidden="true" />
            )}
            <Select
              id="prop-assignee"
              value={issue.assigneeId ?? ""}
              disabled={!canEdit}
              onChange={(e) => patch({ assigneeId: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {members
                .filter((m) => m.role !== "guest" || m.user.id === issue.assigneeId)
                .map(({ user: u }) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </Select>
          </div>
        </Property>

        <div className="border-t border-line pt-3.5">
          <p className="mb-1.5 text-xs text-ink-subtle">Labels</p>
          {labels.length === 0 ? (
            <p className="text-xs text-ink-subtle">No labels in this workspace.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label) => {
                const on = issue.labelIds.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    aria-pressed={on}
                    disabled={!canEdit}
                    onClick={() =>
                      patch({
                        labelIds: on
                          ? issue.labelIds.filter((id) => id !== label.id)
                          : [...issue.labelIds, label.id],
                      })
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs transition-colors disabled:cursor-default",
                      on ? "border-accent/70 bg-accent/10 text-ink" : "border-line-strong text-ink-muted enabled:hover:bg-overlay"
                    )}
                  >
                    <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: label.color }} aria-hidden="true" />
                    {label.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <dl className="space-y-1.5 border-t border-line pt-3.5 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-subtle">Created by</dt>
            <dd className="text-ink-muted">{creator?.name ?? "Former member"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-subtle">Created</dt>
            <dd className="text-ink-muted">{formatRelativeTime(issue.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-subtle">Updated</dt>
            <dd className="text-ink-muted">{formatRelativeTime(issue.updatedAt)}</dd>
          </div>
        </dl>

        {canDelete && (
          <div className="border-t border-line pt-3.5">
            <Button variant="danger" size="sm" className="w-full" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete issue
            </Button>
          </div>
        )}
      </aside>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${issue.identifier}?`}
        description="This also removes its comments and can't be undone."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} data-autofocus>
              Delete issue
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">{issue.title}</span> will be removed from{" "}
          {project?.name ?? "the project"} for everyone in the workspace.
        </p>
      </Dialog>
    </div>
  );
}

