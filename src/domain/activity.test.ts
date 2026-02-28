import { describe, expect, it } from "vitest";
import {
  ACTIVITY_LIMIT,
  appendActivity,
  createActivityEvent,
  groupActivityByDay,
  notificationsFor,
  recordPageEdit,
  unreadCount,
} from "./activity";
import type { ActivityType } from "@/types";

function event(
  id: string,
  type: ActivityType,
  actorId: string,
  now: string,
  extra: Partial<Parameters<typeof createActivityEvent>[0]> = {}
) {
  return createActivityEvent({
    id,
    type,
    actorId,
    now,
    workspaceId: "ws1",
    entityType: "page",
    entityId: "doc1",
    entityTitle: "Spec",
    ...extra,
  });
}

describe("activity feed", () => {
  it("caps the log at the configured limit, dropping the oldest", () => {
    let log = [] as ReturnType<typeof event>[];
    for (let i = 0; i < ACTIVITY_LIMIT + 5; i++) {
      log = appendActivity(log, event(`e${i}`, "page.created", "u1", "2026-01-01T00:00:00Z"));
    }
    expect(log).toHaveLength(ACTIVITY_LIMIT);
    expect(log[0].id).toBe("e5");
  });

  it("coalesces rapid page edits by the same actor", () => {
    let log = recordPageEdit([], event("e1", "page.edited", "u1", "2026-01-01T10:00:00Z"));
    log = recordPageEdit(log, event("e2", "page.edited", "u1", "2026-01-01T10:02:00Z"));
    expect(log).toHaveLength(1);
    expect(log[0].meta.count).toBe(2);
    expect(log[0].createdAt).toBe("2026-01-01T10:02:00Z");

    log = recordPageEdit(log, event("e3", "page.edited", "u2", "2026-01-01T10:03:00Z"));
    log = recordPageEdit(log, event("e4", "page.edited", "u1", "2026-01-01T11:00:00Z"));
    expect(log).toHaveLength(3);
  });

  it("groups events by day, newest first", () => {
    const now = new Date(2026, 0, 10, 12);
    const groups = groupActivityByDay(
      [
        event("a", "page.created", "u1", new Date(2026, 0, 10, 9).toISOString()),
        event("b", "page.created", "u1", new Date(2026, 0, 9, 9).toISOString()),
        event("c", "page.created", "u1", new Date(2026, 0, 10, 11).toISOString()),
      ],
      now
    );
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday"]);
    expect(groups[0].events.map((e) => e.id)).toEqual(["c", "a"]);
  });
});

describe("notifications", () => {
  const issueEvent = (id: string, type: ActivityType, actor: string, at: string, meta = {}) =>
    event(id, type, actor, at, { entityType: "issue", entityId: "i1", meta });

  it("derives mentions, assignments and assignee activity, excluding own actions", () => {
    const events = [
      issueEvent("1", "comment.added", "u2", "2026-01-01T01:00:00Z", { mentions: ["u1"], assigneeId: "u3" }),
      issueEvent("2", "issue.assigned", "u2", "2026-01-01T02:00:00Z", { assigneeId: "u1" }),
      issueEvent("3", "issue.status_changed", "u2", "2026-01-01T03:00:00Z", { assigneeId: "u1" }),
      issueEvent("4", "issue.status_changed", "u1", "2026-01-01T04:00:00Z", { assigneeId: "u1" }),
      issueEvent("5", "issue.created", "u2", "2026-01-01T05:00:00Z", {}),
    ];
    const result = notificationsFor("u1", events);
    expect(result.map((n) => [n.event.id, n.reason])).toEqual([
      ["3", "assigned_activity"],
      ["2", "assigned"],
      ["1", "mention"],
    ]);
  });

  it("counts unread relative to the last-read timestamp", () => {
    const events = [
      issueEvent("1", "issue.assigned", "u2", "2026-01-01T01:00:00Z", { assigneeId: "u1" }),
      issueEvent("2", "issue.assigned", "u2", "2026-01-01T03:00:00Z", { assigneeId: "u1" }),
    ];
    const list = notificationsFor("u1", events);
    expect(unreadCount(list, undefined)).toBe(2);
    expect(unreadCount(list, "2026-01-01T02:00:00Z")).toBe(1);
    expect(unreadCount(list, "2026-01-02T00:00:00Z")).toBe(0);
  });
});
