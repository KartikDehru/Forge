"use client";

import { ActivityFeed } from "@/components/activity/activity-feed";
import { PageHeader } from "@/components/layout/page-header";
import { useActiveWorkspace } from "@/hooks/use-session";

export default function ActivityPage() {
  const workspace = useActiveWorkspace();
  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <PageHeader
        title="Activity"
        description={`Everything that changed in ${workspace?.name ?? "this workspace"}, newest first.`}
        className="mb-6"
      />
      <ActivityFeed />
    </div>
  );
}
