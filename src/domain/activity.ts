import type { ActivityEvent, ActivityMeta, ActivityType } from "@/types";

export const ACTIVITY_LIMIT = 500;
export const PAGE_EDIT_COALESCE_MS = 5 * 60 * 1000;

export interface NewActivity {
  id: string;
  workspaceId: string;
  type: ActivityType;
  actorId: string;
  entityType: ActivityEvent["entityType"];
  entityId: string;
  entityTitle: string;
  meta?: ActivityMeta;
  now: string;
}

export function createActivityEvent(input: NewActivity): ActivityEvent {
  return {
    id: input.id,
    workspaceId: input.workspaceId,
    type: input.type,
    actorId: input.actorId,
    entityType: input.entityType,
    entityId: input.entityId,
    entityTitle: input.entityTitle,
    meta: input.meta ?? {},
    createdAt: input.now,
  };
}

/** Events are stored oldest-first; the log is capped so localStorage stays bounded. */
export function appendActivity(
  events: readonly ActivityEvent[],
  event: ActivityEvent,
  limit = ACTIVITY_LIMIT
): ActivityEvent[] {
  const next = [...events, event];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

/**
 * Typing generates a stream of saves; fold them into one `page.edited` event per
 * actor and page within the coalescing window.
 */
export function recordPageEdit(
  events: readonly ActivityEvent[],
  event: ActivityEvent,
  windowMs = PAGE_EDIT_COALESCE_MS
): ActivityEvent[] {
  for (let i = events.length - 1; i >= 0; i--) {
    const prev = events[i];
    if (
      prev.type === "page.edited" &&
      prev.entityId === event.entityId &&
      prev.actorId === event.actorId
    ) {
      const gap = Date.parse(event.createdAt) - Date.parse(prev.createdAt);
      if (gap <= windowMs) {
        const merged: ActivityEvent = {
          ...prev,
          entityTitle: event.entityTitle,
          createdAt: event.createdAt,
          meta: { ...prev.meta, count: (prev.meta.count ?? 1) + 1 },
        };
        return [...events.slice(0, i), ...events.slice(i + 1), merged];
      }
      break;
    }
  }
  return appendActivity(events, event);
}

export interface ActivityDescription {
  verb: string;
  target: string;
  detail?: string;
}

export function describeActivity(
  event: ActivityEvent,
  resolveName: (userId: string | null | undefined) => string
): ActivityDescription {
  const label = (s?: string) =>
    s ? s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "";
  const target = event.meta.identifier
    ? `${event.meta.identifier} ${event.entityTitle}`
    : event.entityTitle;
  switch (event.type) {
    case "issue.created":
      return { verb: "created", target };
    case "issue.status_changed":
      return {
        verb: "moved",
        target,
        detail: `${label(event.meta.from)} \u2192 ${label(event.meta.to)}`,
      };
    case "issue.assigned":
      return {
        verb: event.meta.assigneeId ? "assigned" : "unassigned",
        target,
        detail: event.meta.assigneeId ? resolveName(event.meta.assigneeId) : undefined,
      };
    case "issue.deleted":
      return { verb: "deleted", target };
    case "page.created":
      return { verb: "created page", target };
    case "page.edited": {
      const count = event.meta.count ?? 1;
      return {
        verb: "edited",
        target,
        detail: count > 1 ? `${count} saves` : undefined,
      };
    }
    case "comment.added":
      return { verb: "commented on", target };
    case "member.invited":
      return {
        verb: "invited",
        target: event.entityTitle,
        detail: label(event.meta.role),
      };
  }
}

export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function groupActivityByDay(
  events: readonly ActivityEvent[],
  now: Date = new Date()
): { label: string; events: ActivityEvent[] }[] {
  const sorted = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups: { label: string; events: ActivityEvent[] }[] = [];
  for (const event of sorted) {
    const label = dayLabel(event.createdAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.events.push(event);
    else groups.push({ label, events: [event] });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Notifications are derived from activity, never stored separately.
// ---------------------------------------------------------------------------

export type NotificationReason = "mention" | "assigned" | "assigned_activity";

export interface AppNotification {
  event: ActivityEvent;
  reason: NotificationReason;
}

export function notificationsFor(
  userId: string,
  events: readonly ActivityEvent[]
): AppNotification[] {
  const out: AppNotification[] = [];
  for (const event of events) {
    if (event.actorId === userId) continue;
    if (event.meta.mentions?.includes(userId)) {
      out.push({ event, reason: "mention" });
    } else if (event.type === "issue.assigned" && event.meta.assigneeId === userId) {
      out.push({ event, reason: "assigned" });
    } else if (
      (event.type === "comment.added" || event.type === "issue.status_changed") &&
      event.entityType === "issue" &&
      event.meta.assigneeId === userId
    ) {
      out.push({ event, reason: "assigned_activity" });
    }
  }
  return out.sort((a, b) => b.event.createdAt.localeCompare(a.event.createdAt));
}

export function unreadCount(
  notifications: readonly AppNotification[],
  readAt: string | undefined
): number {
  if (!readAt) return notifications.length;
  return notifications.filter((n) => n.event.createdAt > readAt).length;
}
