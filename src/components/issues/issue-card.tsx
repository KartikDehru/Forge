"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { Issue, IssueLabel, IssueStatus, User } from "@/types";
import { STATUS_FLOW } from "@/domain/issues";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { PriorityIcon } from "@/components/ui/status-icon";

interface IssueCardProps {
  issue: Issue;
  assignee?: User;
  labels: IssueLabel[];
  draggable: boolean;
  dragging: boolean;
  onDragStart: (issueId: string) => void;
  onDragEnd: () => void;
  onMove: (issueId: string, to: IssueStatus) => void;
}

export function IssueCard({
  issue,
  assignee,
  labels,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: IssueCardProps) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (!event.altKey || !draggable) return;
    const index = STATUS_FLOW.indexOf(issue.status);
    if (index === -1) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onMove(issue.id, STATUS_FLOW[Math.min(index + 1, STATUS_FLOW.length - 1)]);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      onMove(issue.id, STATUS_FLOW[Math.max(index - 1, 0)]);
    }
  };

  return (
    <Link
      href={`/issues/${issue.id}`}
      draggable={draggable}
      onKeyDown={onKeyDown}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/issue-id", issue.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(issue.id);
      }}
      onDragEnd={onDragEnd}
      aria-label={`${issue.identifier} ${issue.title}`}
      aria-keyshortcuts={draggable ? "Alt+ArrowLeft Alt+ArrowRight" : undefined}
      className={cn(
        "group block rounded-md border border-line bg-panel p-2.5 transition-[border-color,opacity,transform] duration-100 hover:border-line-strong",
        dragging && "opacity-40",
        draggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-2xs text-ink-subtle">{issue.identifier}</span>
        <span title={`Priority: ${issue.priority}`}>
          <PriorityIcon priority={issue.priority} />
        </span>
      </div>
      <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">{issue.title}</p>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 truncate rounded border border-line px-1 py-px text-2xs text-ink-muted"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-[2px]" style={{ backgroundColor: label.color }} aria-hidden="true" />
              {label.name}
            </span>
          ))}
          {labels.length > 2 && <span className="text-2xs text-ink-subtle">+{labels.length - 2}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {issue.commentCount > 0 && (
            <span className="flex items-center gap-1 text-2xs text-ink-subtle" aria-label={`${issue.commentCount} comments`}>
              <MessageSquare className="h-3 w-3" aria-hidden="true" />
              {issue.commentCount}
            </span>
          )}
          {assignee ? (
            <Avatar name={assignee.name} color={assignee.avatarColor} size="sm" />
          ) : (
            <span
              className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-line-strong text-[9px] text-ink-subtle"
              title="Unassigned"
              aria-label="Unassigned"
            >
              ?
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
