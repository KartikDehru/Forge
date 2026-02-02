"use client";

import { useWorkspaceStore } from "@/store/workspace-store";
import { IssueBoard } from "@/components/issues/issue-board";

export default function IssuesPage() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId);

  return <IssueBoard projectId={projectId} />;
}