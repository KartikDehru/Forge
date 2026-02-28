"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useRole } from "@/hooks/use-session";
import { IssueDetail } from "@/components/issues/issue-detail";
import { MissingState, NoAccessState } from "@/components/layout/state-views";

export default function IssueDetailPage({ params }: { params: { issueId: string } }) {
  const issue = useWorkspaceStore((s) => s.issues.find((i) => i.id === params.issueId));
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const role = useRole(issue?.workspaceId);

  useEffect(() => {
    if (issue && role) setActiveProject(issue.projectId);
  }, [issue, role, setActiveProject]);

  if (!issue) return <MissingState what="issue" />;
  if (!role) return <NoAccessState what="issue" />;
  return <IssueDetail key={issue.id} issue={issue} />;
}
