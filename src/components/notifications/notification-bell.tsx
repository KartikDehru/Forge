"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { notificationsFor, unreadCount } from "@/domain/activity";
import { useDismiss } from "@/hooks/use-dismiss";
import { useCurrentUser } from "@/hooks/use-session";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityItem, activityHref } from "@/components/activity/activity-item";

const REASON_COPY = {
  mention: "mentioned you",
  assigned: "assigned to you",
  assigned_activity: "on your issue",
} as const;

export function NotificationBell() {
  const user = useCurrentUser();
  const activity = useWorkspaceStore((s) => s.activity);
  const users = useWorkspaceStore((s) => s.users);
  const issues = useWorkspaceStore((s) => s.issues);
  const pages = useWorkspaceStore((s) => s.pages);
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const readAt = useWorkspaceStore((s) => (user ? s.notificationsReadAt[user.id] : undefined));
  const markRead = useWorkspaceStore((s) => s.markNotificationsRead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const items = useMemo(
    () =>
      user
        ? notificationsFor(
            user.id,
            activity.filter((e) => e.workspaceId === workspaceId)
          ).slice(0, 30)
        : [],
    [user, activity, workspaceId]
  );
  const unread = unreadCount(items, readAt);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-overlay hover:text-ink"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-sm bg-accent px-0.5 font-mono text-[9px] font-semibold text-accent-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-40 mt-1.5 w-96 animate-pop-in rounded-lg border border-line-strong bg-panel shadow-[0_20px_50px_-18px_rgba(0,0,0,0.85)]"
        >
          <header className="flex items-center justify-between border-b border-line px-3 py-2">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <Button size="sm" variant="ghost" disabled={unread === 0} onClick={() => markRead(user.id)}>
              Mark all read
            </Button>
          </header>
          <div className="max-h-[26rem] overflow-y-auto p-1.5">
            {items.length === 0 ? (
              <EmptyState
                compact
                icon={BellOff}
                title="You're all caught up"
                description="Mentions, assignments and activity on your issues land here."
                className="border-0"
              />
            ) : (
              <ul>
                {items.map(({ event, reason }) => (
                  <li key={event.id}>
                    <p className="px-2 pt-1.5 text-2xs uppercase tracking-wider text-ink-subtle">
                      {REASON_COPY[reason]}
                    </p>
                    <ActivityItem
                      event={event}
                      users={users}
                      href={activityHref(event, issues, pages)}
                      unread={!readAt || event.createdAt > readAt}
                      compact
                      onNavigate={() => {
                        markRead(user.id);
                        close();
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
