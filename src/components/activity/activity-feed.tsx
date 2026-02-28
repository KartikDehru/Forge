"use client";

import { useMemo } from "react";
import { Activity } from "lucide-react";
import { groupActivityByDay } from "@/domain/activity";
import { useWorkspaceStore } from "@/store/workspace-store";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityItem, activityHref } from "@/components/activity/activity-item";

interface ActivityFeedProps {
  limit?: number;
  grouped?: boolean;
  compact?: boolean;
}

export function ActivityFeed({ limit, grouped = true, compact }: ActivityFeedProps) {
  const activity = useWorkspaceStore((s) => s.activity);
  const users = useWorkspaceStore((s) => s.users);
  const issues = useWorkspaceStore((s) => s.issues);
  const pages = useWorkspaceStore((s) => s.pages);
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const events = useMemo(() => {
    const scoped = activity
      .filter((e) => e.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit ? scoped.slice(0, limit) : scoped;
  }, [activity, workspaceId, limit]);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Nothing has happened yet"
        description="Creating issues, moving them across the board, editing pages and commenting will show up here."
        compact={compact}
      />
    );
  }

  if (!grouped) {
    return (
      <ul className="space-y-0.5">
        {events.map((event) => (
          <li key={event.id}>
            <ActivityItem event={event} users={users} href={activityHref(event, issues, pages)} compact={compact} />
          </li>
        ))}
      </ul>
    );
  }

  const groups = groupActivityByDay(events);
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h3 className="section-label mb-1.5 px-2">{group.label}</h3>
          <ul className="space-y-0.5">
            {group.events.map((event) => (
              <li key={event.id}>
                <ActivityItem event={event} users={users} href={activityHref(event, issues, pages)} compact={compact} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
