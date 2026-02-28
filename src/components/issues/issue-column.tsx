"use client";

import { Plus } from "lucide-react";
import type { Issue, IssueLabel, IssueStatus, User } from "@/types";
import { canTransition } from "@/domain/issues";
import { ISSUE_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { StatusIcon } from "@/components/ui/status-icon";
import { IssueCard } from "@/components/issues/issue-card";

interface IssueColumnProps {
  status: IssueStatus;
  issues: Issue[];
  users: User[];
  labels: IssueLabel[];
  index: number;
  canMove: boolean;
  canCreate: boolean;
  draggingFrom: IssueStatus | null;
  draggingId: string | null;
  onDragStart: (issueId: string) => void;
  onDragEnd: () => void;
  onDrop: (issueId: string, status: IssueStatus) => void;
  onMove: (issueId: string, to: IssueStatus) => void;
  onCreate: (status: IssueStatus) => void;
}

const CREATABLE: IssueStatus[] = ["backlog", "todo", "in_progress"];

export function IssueColumn({
  status,
  issues,
  users,
  labels,
  index,
  canMove,
  canCreate,
  draggingFrom,
  draggingId,
  onDragStart,
  onDragEnd,
  onDrop,
  onMove,
  onCreate,
}: IssueColumnProps) {
  const isDragging = draggingFrom !== null;
  const validTarget = isDragging && draggingFrom !== status && canTransition(draggingFrom, status);
  const invalidTarget = isDragging && draggingFrom !== status && !validTarget;

  return (
    <section
      aria-label={`${ISSUE_STATUS_LABELS[status]}, ${issues.length} issues`}
      style={{ animationDelay: `${index * 45}ms` }}
      className={cn(
        "flex w-[272px] shrink-0 animate-column-in flex-col rounded-lg border bg-panel/60 transition-colors duration-100",
        status === "canceled" && "w-[240px]",
        validTarget ? "border-accent/60 bg-accent/5" : "border-line",
        invalidTarget && "opacity-60"
      )}
      onDragOver={(e) => {
        // Invalid targets still accept the drop so the user gets an explanation toast.
        if (isDragging && draggingFrom !== status) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/issue-id");
        if (id) onDrop(id, status);
      }}
    >
      <header className="flex h-9 items-center gap-2 px-3">
        <StatusIcon status={status} />
        <h3 className="text-xs font-semibold text-ink">{ISSUE_STATUS_LABELS[status]}</h3>
        <span className="font-mono text-2xs text-ink-subtle">{issues.length}</span>
        {canCreate && CREATABLE.includes(status) && (
          <button
            type="button"
            onClick={() => onCreate(status)}
            aria-label={`Create issue in ${ISSUE_STATUS_LABELS[status]}`}
            className="ml-auto rounded p-1 text-ink-subtle transition-colors hover:bg-overlay hover:text-ink"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </header>
      <div className="flex min-h-[72px] flex-1 flex-col gap-1.5 px-2 pb-2">
        {issues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            assignee={users.find((u) => u.id === issue.assigneeId)}
            labels={labels.filter((l) => issue.labelIds.includes(l.id))}
            draggable={canMove}
            dragging={draggingId === issue.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onMove={onMove}
          />
        ))}
        {issues.length === 0 && (
          <p className="flex flex-1 items-center justify-center rounded-md border border-dashed border-line px-2 py-4 text-center text-2xs text-ink-subtle">
            {validTarget ? "Drop to move here" : "No issues"}
          </p>
        )}
      </div>
    </section>
  );
}
