"use client";

import Link from "next/link";
import {
  CircleDot,
  FilePen,
  FilePlus2,
  MessageSquare,
  Trash2,
  UserCheck,
  UserPlus,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { ActivityEvent, ActivityType, Issue, DocumentPage, User } from "@/types";
import { describeActivity } from "@/domain/activity";
import { formatRelativeTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

const ICONS: Record<ActivityType, LucideIcon> = {
  "issue.created": CircleDot,
  "issue.status_changed": Workflow,
  "issue.assigned": UserCheck,
  "issue.deleted": Trash2,
  "page.created": FilePlus2,
  "page.edited": FilePen,
  "comment.added": MessageSquare,
  "member.invited": UserPlus,
};

export function activityHref(
  event: ActivityEvent,
  issues: readonly Issue[],
  pages: readonly DocumentPage[]
): string | null {
  if (event.entityType === "issue" && issues.some((i) => i.id === event.entityId)) {
    return `/issues/${event.entityId}`;
  }
  if (event.entityType === "page" && pages.some((p) => p.id === event.entityId)) {
    return `/pages/${event.entityId}`;
  }
  return null;
}

interface ActivityItemProps {
  event: ActivityEvent;
  users: readonly User[];
  href: string | null;
  compact?: boolean;
  unread?: boolean;
  onNavigate?: () => void;
}

export function ActivityItem({ event, users, href, compact, unread, onNavigate }: ActivityItemProps) {
  const actor = users.find((u) => u.id === event.actorId);
  const nameOf = (id: string | null | undefined) => users.find((u) => u.id === id)?.name ?? "Someone";
  const desc = describeActivity(event, nameOf);
  const Icon = ICONS[event.type];

  const body = (
    <>
      <span className="relative mt-0.5 shrink-0">
        {actor ? (
          <Avatar name={actor.name} color={actor.avatarColor} size="md" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded bg-overlay text-ink-subtle">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-panel bg-raised text-ink-muted">
          <Icon className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className={compact ? "block text-xs leading-snug" : "block text-sm leading-snug"}>
          <span className="font-medium text-ink">{actor?.name ?? "Someone"}</span>{" "}
          <span className="text-ink-muted">{desc.verb}</span>{" "}
          <span className="text-ink">{desc.target}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-2xs text-ink-subtle">
          {desc.detail && <span className="rounded bg-overlay px-1 py-px text-ink-muted">{desc.detail}</span>}
          <time dateTime={event.createdAt}>{formatRelativeTime(event.createdAt)}</time>
        </span>
      </span>
      {unread && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-[2px] bg-accent" aria-label="Unread" />}
    </>
  );

  const className =
    "flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-overlay";

  return href ? (
    <Link href={href} onClick={onNavigate} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
