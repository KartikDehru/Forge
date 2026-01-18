"use client";

import { useMemo, useState } from "react";
import type { Issue, IssuePriority, IssueStatus } from "@/types";
import { useWorkspaceStore } from "@/store/workspace-store";
import { ISSUE_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import { CommentThread } from "@/components/comments/comment-thread";
import { Avatar } from "@/components/ui/avatar";
import { PresenceBar } from "@/components/presence/presence-bar";

interface IssueDetailProps {
  issue: Issue;
}

export function IssueDetail({ issue: initial }: IssueDetailProps) {
  const users = useWorkspaceStore((s) => s.users);
  const updateIssue = useWorkspaceStore((s) => s.updateIssue);
  const issue =
    useWorkspaceStore((s) => s.issues.find((i) => i.id === initial.id)) ?? initial;

  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description);

  const assignee = users.find((u) => u.id === issue.assigneeId);

  const saveField = (patch: Partial<Issue>) => {
    updateIssue({ ...issue, ...patch, updatedAt: new Date().toISOString() });
  };

  const statusOptions = useMemo(
    () => Object.entries(ISSUE_STATUS_LABELS) as [IssueStatus, string][],
    []
  );
  const priorityOptions = useMemo(
    () => Object.entries(PRIORITY_LABELS) as [IssuePriority, string][],
    []
  );

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_280px]">
      <div>
        <header className="mb-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <span className="font-mono">{issue.identifier}</span>
            <PresenceBar roomId={`issue:${issue.id}`} />
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveField({ title })}
            className="w-full bg-transparent text-2xl font-semibold text-zinc-100 focus:outline-none"
          />
        </header>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => saveField({ description })}
          rows={6}
          placeholder="Add a description…"
          className="mb-6 w-full rounded-lg border border-surface-border bg-surface-elevated p-3 text-sm text-zinc-200 focus:border-accent focus:outline-none"
        />
        <CommentThread entityType="issue" entityId={issue.id} />
      </div>

      <aside className="space-y-4 rounded-xl border border-surface-border bg-surface-elevated/50 p-4">
        <Field label="Status">
          <select
            value={issue.status}
            onChange={(e) => saveField({ status: e.target.value as IssueStatus })}
            className="w-full rounded-lg border border-surface-border bg-surface px-2 py-1.5 text-sm"
          >
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            value={issue.priority}
            onChange={(e) => saveField({ priority: e.target.value as IssuePriority })}
            className="w-full rounded-lg border border-surface-border bg-surface px-2 py-1.5 text-sm"
          >
            {priorityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assignee">
          <select
            value={issue.assigneeId ?? ""}
            onChange={(e) =>
              saveField({ assigneeId: e.target.value || null })
            }
            className="w-full rounded-lg border border-surface-border bg-surface px-2 py-1.5 text-sm"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          {assignee && (
            <div className="mt-2 flex items-center gap-2">
              <Avatar name={assignee.name} color={assignee.avatarColor} size="sm" />
              <span className="text-sm text-zinc-300">{assignee.name}</span>
            </div>
          )}
        </Field>
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      {children}
    </div>
  );
}