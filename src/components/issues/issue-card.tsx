"use client";

import Link from "next/link";
import type { Issue, User } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface IssueCardProps {
  issue: Issue;
  users: User[];
  onDragStart?: (issueId: string) => void;
}

const priorityColors: Record<Issue["priority"], string> = {
  none: "text-zinc-500",
  low: "text-blue-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  urgent: "text-red-400",
};

export function IssueCard({ issue, users, onDragStart }: IssueCardProps) {
  const assignee = users.find((u) => u.id === issue.assigneeId);

  return (
    <Link
      href={`/issues/${issue.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/issue-id", issue.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(issue.id);
      }}
      className="block rounded-lg border border-surface-border bg-surface p-3 shadow-sm transition hover:border-zinc-600"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-zinc-500">{issue.identifier}</span>
        <span className={cn("text-xs", priorityColors[issue.priority])}>
          {PRIORITY_LABELS[issue.priority]}
        </span>
      </div>
      <p className="mb-3 text-sm font-medium text-zinc-100">{issue.title}</p>
      <div className="flex items-center justify-between">
        {assignee ? (
          <Avatar name={assignee.name} color={assignee.avatarColor} size="sm" />
        ) : (
          <span className="text-xs text-zinc-600">Unassigned</span>
        )}
        {issue.commentCount > 0 && (
          <Badge>{issue.commentCount} comments</Badge>
        )}
      </div>
    </Link>
  );
}