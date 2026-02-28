export type ActivityType =
  | "issue.created"
  | "issue.status_changed"
  | "issue.assigned"
  | "issue.deleted"
  | "page.created"
  | "page.edited"
  | "comment.added"
  | "member.invited";

export interface ActivityMeta {
  from?: string;
  to?: string;
  assigneeId?: string | null;
  mentions?: string[];
  projectId?: string;
  identifier?: string;
  role?: string;
  /** Number of edits folded into this event (page.edited coalescing). */
  count?: number;
}

export interface ActivityEvent {
  id: string;
  workspaceId: string;
  type: ActivityType;
  actorId: string;
  entityType: "issue" | "page" | "workspace";
  entityId: string;
  /** Title snapshot so the feed stays readable after renames or deletes. */
  entityTitle: string;
  meta: ActivityMeta;
  createdAt: string;
}
