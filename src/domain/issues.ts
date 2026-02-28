import type { Issue, IssuePriority, IssueStatus } from "@/types";
import { domainError, err, ok, type DomainError, type Result } from "./result";

/** Happy-path order of the workflow. `canceled` sits outside the flow. */
export const STATUS_FLOW: readonly IssueStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];

export const ALL_STATUSES: readonly IssueStatus[] = [...STATUS_FLOW, "canceled"];

export const PRIORITIES: readonly IssuePriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
];

const PRIORITY_RANK: Record<IssuePriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

/** Statuses that mean someone is actively on the hook for the work. */
const REQUIRES_ASSIGNEE: ReadonlySet<IssueStatus> = new Set<IssueStatus>([
  "in_progress",
  "in_review",
  "done",
]);

const CANCELABLE: ReadonlySet<IssueStatus> = new Set<IssueStatus>([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
]);

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 5000;

export function statusLabel(status: IssueStatus): string {
  return {
    backlog: "Backlog",
    todo: "Todo",
    in_progress: "In progress",
    in_review: "In review",
    done: "Done",
    canceled: "Canceled",
  }[status];
}

/**
 * Structural transition rules, ignoring issue data:
 *  - forward moves go exactly one step along the flow
 *  - backward moves may jump to any earlier step (revert / reopen)
 *  - any open status may be canceled; `done` may not
 *  - `canceled` can only be reopened into `backlog`
 */
export function allowedTransitions(from: IssueStatus): IssueStatus[] {
  if (from === "canceled") return ["backlog"];
  const index = STATUS_FLOW.indexOf(from);
  const targets: IssueStatus[] = [];
  for (let i = 0; i < index; i++) targets.push(STATUS_FLOW[i]);
  if (index < STATUS_FLOW.length - 1) targets.push(STATUS_FLOW[index + 1]);
  if (CANCELABLE.has(from)) targets.push("canceled");
  return targets;
}

export function canTransition(from: IssueStatus, to: IssueStatus): boolean {
  return allowedTransitions(from).includes(to);
}

export function validateTransition(
  issue: Pick<Issue, "status" | "assigneeId">,
  to: IssueStatus
): Result<IssueStatus, DomainError> {
  const from = issue.status;
  if (from === to) {
    return err(domainError("CONFLICT", `Issue is already ${statusLabel(to)}.`));
  }
  if (!canTransition(from, to)) {
    if (from === "done" && to === "canceled") {
      return err(
        domainError(
          "INVALID_TRANSITION",
          "Completed issues can't be canceled. Reopen it first."
        )
      );
    }
    if (from === "canceled") {
      return err(
        domainError(
          "INVALID_TRANSITION",
          "Canceled issues can only be reopened to Backlog."
        )
      );
    }
    return err(
      domainError(
        "INVALID_TRANSITION",
        `Can't move from ${statusLabel(from)} to ${statusLabel(to)}. Move one step at a time.`
      )
    );
  }
  if (REQUIRES_ASSIGNEE.has(to) && !issue.assigneeId) {
    return err(
      domainError(
        "ASSIGNEE_REQUIRED",
        `Assign someone before moving to ${statusLabel(to)}.`,
        "assigneeId"
      )
    );
  }
  return ok(to);
}

export function applyTransition(
  issue: Issue,
  to: IssueStatus,
  now: string
): Result<Issue, DomainError> {
  const checked = validateTransition(issue, to);
  if (!checked.ok) return checked;
  return ok({ ...issue, status: to, updatedAt: now });
}

// ---------------------------------------------------------------------------
// Creation & patching
// ---------------------------------------------------------------------------

export interface NewIssueInput {
  title: string;
  description?: string;
  priority?: IssuePriority;
  assigneeId?: string | null;
  projectId: string;
  status?: IssueStatus;
  labelIds?: string[];
}

export interface IssueContext {
  workspaceId: string;
  /** Project key + owning workspace, resolved by the caller. */
  project: { id: string; key: string; workspaceId: string };
  memberIds: readonly string[];
  labelIds: readonly string[];
  existingIssues: readonly Issue[];
  actorId: string;
  now: string;
  id: string;
}

export function validateTitle(raw: string): Result<string, DomainError> {
  const title = raw.trim();
  if (!title) {
    return err(domainError("VALIDATION", "Give the issue a title.", "title"));
  }
  if (title.length > TITLE_MAX) {
    return err(
      domainError("VALIDATION", `Title must be ${TITLE_MAX} characters or fewer.`, "title")
    );
  }
  return ok(title);
}

function validateDescription(raw: string): Result<string, DomainError> {
  if (raw.length > DESCRIPTION_MAX) {
    return err(
      domainError(
        "VALIDATION",
        `Description must be ${DESCRIPTION_MAX} characters or fewer.`,
        "description"
      )
    );
  }
  return ok(raw);
}

function validateAssignee(
  assigneeId: string | null,
  memberIds: readonly string[]
): Result<string | null, DomainError> {
  if (assigneeId !== null && !memberIds.includes(assigneeId)) {
    return err(
      domainError("VALIDATION", "Assignee must be a member of this workspace.", "assigneeId")
    );
  }
  return ok(assigneeId);
}

export function nextIdentifier(key: string, issues: readonly Issue[]): string {
  const prefix = `${key}-`;
  let max = 0;
  for (const issue of issues) {
    if (!issue.identifier.startsWith(prefix)) continue;
    const n = Number.parseInt(issue.identifier.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

export function buildIssue(
  input: NewIssueInput,
  ctx: IssueContext
): Result<Issue, DomainError> {
  if (ctx.project.id !== input.projectId || ctx.project.workspaceId !== ctx.workspaceId) {
    return err(domainError("VALIDATION", "Pick a project from this workspace.", "projectId"));
  }
  const title = validateTitle(input.title);
  if (!title.ok) return title;
  const description = validateDescription(input.description ?? "");
  if (!description.ok) return description;
  const assigneeId = validateAssignee(input.assigneeId ?? null, ctx.memberIds);
  if (!assigneeId.ok) return assigneeId;

  const status = input.status ?? "backlog";
  if (status === "canceled" || status === "done") {
    return err(domainError("VALIDATION", "New issues can't start closed.", "status"));
  }
  if (REQUIRES_ASSIGNEE.has(status) && !assigneeId.value) {
    return err(
      domainError(
        "ASSIGNEE_REQUIRED",
        `Assign someone before starting in ${statusLabel(status)}.`,
        "assigneeId"
      )
    );
  }
  const labelIds = (input.labelIds ?? []).filter((id) => ctx.labelIds.includes(id));

  return ok({
    id: ctx.id,
    projectId: ctx.project.id,
    workspaceId: ctx.workspaceId,
    identifier: nextIdentifier(ctx.project.key, ctx.existingIssues),
    title: title.value,
    description: description.value,
    status,
    priority: input.priority ?? "none",
    assigneeId: assigneeId.value,
    labelIds,
    createdBy: ctx.actorId,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    commentCount: 0,
  });
}

export type IssuePatch = Partial<
  Pick<Issue, "title" | "description" | "priority" | "assigneeId" | "labelIds">
>;

export interface IssuePatchContext {
  memberIds: readonly string[];
  labelIds: readonly string[];
  now: string;
}

export function applyIssuePatch(
  issue: Issue,
  patch: IssuePatch,
  ctx: IssuePatchContext
): Result<Issue, DomainError> {
  let next: Issue = { ...issue };

  if (patch.title !== undefined) {
    const title = validateTitle(patch.title);
    if (!title.ok) return title;
    next.title = title.value;
  }
  if (patch.description !== undefined) {
    const description = validateDescription(patch.description);
    if (!description.ok) return description;
    next.description = description.value;
  }
  if (patch.priority !== undefined) next.priority = patch.priority;
  if (patch.assigneeId !== undefined) {
    const assignee = validateAssignee(patch.assigneeId, ctx.memberIds);
    if (!assignee.ok) return assignee;
    if (assignee.value === null && REQUIRES_ASSIGNEE.has(issue.status) && issue.status !== "done") {
      return err(
        domainError(
          "ASSIGNEE_REQUIRED",
          `Move the issue out of ${statusLabel(issue.status)} before unassigning it.`,
          "assigneeId"
        )
      );
    }
    next.assigneeId = assignee.value;
  }
  if (patch.labelIds !== undefined) {
    next.labelIds = patch.labelIds.filter((id) => ctx.labelIds.includes(id));
  }

  next = { ...next, updatedAt: ctx.now };
  return ok(next);
}

// ---------------------------------------------------------------------------
// Querying
// ---------------------------------------------------------------------------

export interface IssueFilters {
  query: string;
  assignee: "all" | "unassigned" | string;
  priority: "all" | IssuePriority;
  label: "all" | string;
}

export const EMPTY_FILTERS: IssueFilters = {
  query: "",
  assignee: "all",
  priority: "all",
  label: "all",
};

export function hasActiveFilters(filters: IssueFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.assignee !== "all" ||
    filters.priority !== "all" ||
    filters.label !== "all"
  );
}

export function filterIssues(
  issues: readonly Issue[],
  filters: IssueFilters
): Issue[] {
  const tokens = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return issues.filter((issue) => {
    if (filters.assignee === "unassigned" && issue.assigneeId !== null) return false;
    if (
      filters.assignee !== "all" &&
      filters.assignee !== "unassigned" &&
      issue.assigneeId !== filters.assignee
    ) {
      return false;
    }
    if (filters.priority !== "all" && issue.priority !== filters.priority) return false;
    if (filters.label !== "all" && !issue.labelIds.includes(filters.label)) return false;
    if (tokens.length) {
      const haystack =
        `${issue.identifier} ${issue.title} ${issue.description}`.toLowerCase();
      if (!tokens.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });
}

export function compareIssues(a: Issue, b: Issue): number {
  return (
    PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export function groupByStatus(
  issues: readonly Issue[]
): Record<IssueStatus, Issue[]> {
  const groups = Object.fromEntries(
    ALL_STATUSES.map((s) => [s, [] as Issue[]])
  ) as Record<IssueStatus, Issue[]>;
  for (const issue of issues) groups[issue.status].push(issue);
  for (const status of ALL_STATUSES) groups[status].sort(compareIssues);
  return groups;
}
