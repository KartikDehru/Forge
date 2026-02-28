import { describe, expect, it } from "vitest";
import type { Issue } from "@/types";
import {
  EMPTY_FILTERS,
  allowedTransitions,
  applyIssuePatch,
  applyTransition,
  buildIssue,
  filterIssues,
  groupByStatus,
  nextIdentifier,
  validateTransition,
} from "./issues";

const NOW = "2026-01-01T00:00:00.000Z";

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "i1",
    projectId: "p1",
    workspaceId: "ws1",
    identifier: "PLAT-1",
    title: "Ship it",
    description: "",
    status: "backlog",
    priority: "medium",
    assigneeId: "u1",
    labelIds: [],
    createdBy: "u1",
    createdAt: NOW,
    updatedAt: NOW,
    commentCount: 0,
    ...overrides,
  };
}

describe("issue status machine", () => {
  it("walks the happy path one step at a time", () => {
    const path = ["todo", "in_progress", "in_review", "done"] as const;
    let issue = makeIssue();
    for (const status of path) {
      const result = applyTransition(issue, status, NOW);
      expect(result.ok).toBe(true);
      if (result.ok) issue = result.value;
    }
    expect(issue.status).toBe("done");
  });

  it("rejects skipping forward steps", () => {
    const result = validateTransition(makeIssue({ status: "backlog" }), "in_review");
    expect(result).toMatchObject({ ok: false, error: { code: "INVALID_TRANSITION" } });
  });

  it("allows reverting or reopening to any earlier step", () => {
    expect(allowedTransitions("done")).toEqual(
      expect.arrayContaining(["backlog", "todo", "in_progress", "in_review"])
    );
    expect(validateTransition(makeIssue({ status: "done" }), "todo").ok).toBe(true);
  });

  it("requires an assignee for active statuses", () => {
    const result = validateTransition(
      makeIssue({ status: "todo", assigneeId: null }),
      "in_progress"
    );
    expect(result).toMatchObject({ ok: false, error: { code: "ASSIGNEE_REQUIRED" } });
  });

  it("allows canceling open issues but never completed ones", () => {
    for (const status of ["backlog", "todo", "in_progress", "in_review"] as const) {
      expect(validateTransition(makeIssue({ status }), "canceled").ok).toBe(true);
    }
    const done = validateTransition(makeIssue({ status: "done" }), "canceled");
    expect(done).toMatchObject({ ok: false, error: { code: "INVALID_TRANSITION" } });
  });

  it("only reopens canceled issues into backlog", () => {
    const canceled = makeIssue({ status: "canceled" });
    expect(allowedTransitions("canceled")).toEqual(["backlog"]);
    expect(validateTransition(canceled, "todo").ok).toBe(false);
    expect(validateTransition(canceled, "backlog").ok).toBe(true);
  });

  it("treats a same-status move as a conflict", () => {
    expect(validateTransition(makeIssue(), "backlog")).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
  });
});

describe("issue creation and patching", () => {
  const ctx = {
    workspaceId: "ws1",
    project: { id: "p1", key: "PLAT", workspaceId: "ws1" },
    memberIds: ["u1", "u2"],
    labelIds: ["l1"],
    existingIssues: [makeIssue({ identifier: "PLAT-7" }), makeIssue({ identifier: "MOB-40" })],
    actorId: "u1",
    now: NOW,
    id: "new1",
  };

  it("generates the next identifier per project key", () => {
    expect(nextIdentifier("PLAT", ctx.existingIssues)).toBe("PLAT-8");
    expect(nextIdentifier("NEW", ctx.existingIssues)).toBe("NEW-1");
  });

  it("builds a trimmed, validated issue", () => {
    const result = buildIssue(
      { title: "  Fix flicker  ", projectId: "p1", assigneeId: "u2", labelIds: ["l1", "bogus"] },
      ctx
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        title: "Fix flicker",
        identifier: "PLAT-8",
        status: "backlog",
        labelIds: ["l1"],
        createdBy: "u1",
      });
    }
  });

  it("returns typed validation errors instead of failing silently", () => {
    expect(buildIssue({ title: "   ", projectId: "p1" }, ctx)).toMatchObject({
      ok: false,
      error: { code: "VALIDATION", field: "title" },
    });
    expect(buildIssue({ title: "x", projectId: "p1", assigneeId: "ghost" }, ctx)).toMatchObject({
      ok: false,
      error: { field: "assigneeId" },
    });
    expect(buildIssue({ title: "x", projectId: "other" }, ctx)).toMatchObject({
      ok: false,
      error: { field: "projectId" },
    });
  });

  it("blocks unassigning an issue that is in progress", () => {
    const issue = makeIssue({ status: "in_progress" });
    const result = applyIssuePatch(issue, { assigneeId: null }, ctx);
    expect(result).toMatchObject({ ok: false, error: { code: "ASSIGNEE_REQUIRED" } });
  });
});

describe("issue filtering", () => {
  const issues = [
    makeIssue({ id: "a", identifier: "PLAT-1", title: "Presence flicker", priority: "high", assigneeId: "u1", labelIds: ["bug"] }),
    makeIssue({ id: "b", identifier: "PLAT-2", title: "Slash menu", priority: "low", assigneeId: null, labelIds: ["feature"] }),
    makeIssue({ id: "c", identifier: "PLAT-3", title: "Palette shortcuts", priority: "high", assigneeId: "u2", labelIds: [] }),
  ];

  it("searches title and identifier with AND semantics", () => {
    expect(filterIssues(issues, { ...EMPTY_FILTERS, query: "plat-2" }).map((i) => i.id)).toEqual(["b"]);
    expect(filterIssues(issues, { ...EMPTY_FILTERS, query: "slash menu" }).map((i) => i.id)).toEqual(["b"]);
    expect(filterIssues(issues, { ...EMPTY_FILTERS, query: "slash flicker" })).toHaveLength(0);
  });

  it("combines assignee, priority and label filters", () => {
    expect(filterIssues(issues, { ...EMPTY_FILTERS, priority: "high" })).toHaveLength(2);
    expect(filterIssues(issues, { ...EMPTY_FILTERS, assignee: "unassigned" }).map((i) => i.id)).toEqual(["b"]);
    expect(
      filterIssues(issues, { ...EMPTY_FILTERS, priority: "high", assignee: "u2" }).map((i) => i.id)
    ).toEqual(["c"]);
    expect(filterIssues(issues, { ...EMPTY_FILTERS, label: "bug" }).map((i) => i.id)).toEqual(["a"]);
  });

  it("groups by status with priority ordering", () => {
    const grouped = groupByStatus([
      makeIssue({ id: "low", priority: "low" }),
      makeIssue({ id: "urgent", priority: "urgent" }),
    ]);
    expect(grouped.backlog.map((i) => i.id)).toEqual(["urgent", "low"]);
    expect(grouped.done).toEqual([]);
  });
});
