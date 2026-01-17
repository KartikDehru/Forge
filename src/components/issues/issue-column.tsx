"use client";

import type { Issue, IssueStatus, User } from "@/types";
import { ISSUE_STATUS_LABELS } from "@/lib/constants";
import { IssueCard } from "@/components/issues/issue-card";

interface IssueColumnProps {
  status: IssueStatus;
  issues: Issue[];
  users: User[];
  onDrop: (issueId: string, status: IssueStatus) => void;
}

export function IssueColumn({ status, issues, users, onDrop }: IssueColumnProps) {
  const columnIssues = issues.filter((i) => i.status === status);

  return (
    <section
      className="flex min-w-[260px] flex-1 flex-col rounded-xl border border-surface-border bg-surface-elevated/40"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const issueId = e.dataTransfer.getData("text/issue-id");
        if (issueId) onDrop(issueId, status);
      }}
    >
      <header className="flex items-center justify-between border-b border-surface-border px-3 py-2">
        <h3 className="text-sm font-medium text-zinc-200">
          {ISSUE_STATUS_LABELS[status]}
        </h3>
        <span className="text-xs text-zinc-500">{columnIssues.length}</span>
      </header>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {columnIssues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} users={users} />
        ))}
      </div>
    </section>
  );
}