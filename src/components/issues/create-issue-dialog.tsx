"use client";

import { useMemo, useState } from "react";
import type { IssuePriority, IssueStatus } from "@/types";
import { PRIORITIES } from "@/domain/issues";
import type { DomainError } from "@/domain/result";
import { useCan, useCurrentUser, useMembers } from "@/hooks/use-session";
import { ISSUE_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";

const START_STATUSES: IssueStatus[] = ["backlog", "todo", "in_progress"];
const FORM_ID = "create-issue-form";

function CreateIssueForm({ onDone }: { onDone: () => void }) {
  const draft = useUiStore((s) => s.createIssue.draft);
  const toast = useUiStore((s) => s.toast);
  const user = useCurrentUser();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const projects = useWorkspaceStore((s) => s.projects);
  const allLabels = useWorkspaceStore((s) => s.labels);
  const createIssue = useWorkspaceStore((s) => s.createIssue);
  const members = useMembers(workspaceId);

  const workspaceProjects = useMemo(
    () => projects.filter((p) => p.workspaceId === workspaceId),
    [projects, workspaceId]
  );
  const labels = useMemo(
    () => allLabels.filter((l) => l.workspaceId === workspaceId),
    [allLabels, workspaceId]
  );
  const assignable = members.filter((m) => m.role !== "guest");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(
    workspaceProjects.find((p) => p.id === draft.projectId)?.id ?? workspaceProjects[0]?.id ?? ""
  );
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [status, setStatus] = useState<IssueStatus>(
    draft.status && START_STATUSES.includes(draft.status) ? draft.status : "backlog"
  );
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [error, setError] = useState<DomainError | null>(null);

  const fieldError = (field: string) => (error?.field === field ? error.message : null);
  const formError = error && !error.field ? error.message : null;

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!user) return;
    const result = createIssue(user.id, {
      title,
      description,
      projectId,
      priority,
      assigneeId: assigneeId || null,
      status,
      labelIds,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast("success", `Created ${result.value.identifier}`);
    onDone();
  };

  return (
    <form
      id={FORM_ID}
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
      }}
      className="space-y-4"
    >
      <Field label="Title" error={fieldError("title")}>
        {(props) => (
          <Input
            {...props}
            data-autofocus
            value={title}
            maxLength={220}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder="What needs to happen?"
            className="h-9 text-base font-medium"
          />
        )}
      </Field>

      <Field label="Description" error={fieldError("description")}>
        {(props) => (
          <Textarea
            {...props}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Context, acceptance criteria, links"
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Project" error={fieldError("projectId")}>
          {(props) => (
            <Select {...props} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {workspaceProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Status" error={fieldError("status")}>
          {(props) => (
            <Select {...props} value={status} onChange={(e) => setStatus(e.target.value as IssueStatus)}>
              {START_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ISSUE_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Priority">
          {(props) => (
            <Select {...props} value={priority} onChange={(e) => setPriority(e.target.value as IssuePriority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Assignee" error={fieldError("assigneeId")}>
          {(props) => (
            <Select {...props} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {assignable.map(({ user: u }) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {labels.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-ink-muted">Labels</legend>
          <div className="flex flex-wrap gap-1.5">
            {labels.map((label) => {
              const on = labelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setLabelIds((ids) => (on ? ids.filter((id) => id !== label.id) : [...ids, label.id]))
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs transition-colors",
                    on ? "border-accent bg-accent/10 text-ink" : "border-line-strong text-ink-muted hover:bg-overlay"
                  )}
                >
                  <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: label.color }} aria-hidden="true" />
                  {label.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {formError && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {formError}
        </p>
      )}
    </form>
  );
}

export function CreateIssueDialog() {
  const open = useUiStore((s) => s.createIssue.open);
  const close = useUiStore((s) => s.closeCreateIssue);
  const allowed = useCan("issue.create");

  return (
    <Dialog
      open={open && allowed}
      onClose={close}
      title="New issue"
      description="Issues are numbered per project, e.g. PLAT-23."
      size="md"
      footer={
        <>
          <span className="mr-auto flex items-center gap-1 text-2xs text-ink-subtle">
            <Kbd>⌘</Kbd>
            <Kbd>Enter</Kbd> to create
          </span>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID}>
            Create issue
          </Button>
        </>
      }
    >
      <CreateIssueForm onDone={close} />
    </Dialog>
  );
}
