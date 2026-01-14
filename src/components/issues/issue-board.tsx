"use client";

import type { IssueStatus } from "@/types";
import { ISSUE_STATUS_ORDER } from "@/lib/constants";
import { useWorkspaceStore } from "@/store/workspace-store";
import { IssueColumn } from "@/components/issues/issue-column";
import { PresenceBar } from "@/components/presence/presence-bar";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";

interface IssueBoardProps {
  projectId: string;
}

export function IssueBoard({ projectId }: IssueBoardProps) {
  const users = useWorkspaceStore((s) => s.users);
  const issues = useWorkspaceStore((s) => s.issues).filter(
    (i) => i.projectId === projectId
  );
  const moveIssue = useWorkspaceStore((s) => s.moveIssue);
  const addIssue = useWorkspaceStore((s) => s.addIssue);
  const activeWs = useWorkspaceStore((s) => s.activeWorkspaceId);

  const handleDrop = (issueId: string, status: IssueStatus) => {
    moveIssue(issueId, status);
  };

  const createIssue = () => {
    const id = nanoid(8);
    const count = issues.length + 1;
    addIssue({
      id,
      projectId,
      workspaceId: activeWs,
      identifier: `PLAT-${count + 20}`,
      title: "New issue",
      description: "",
      status: "backlog",
      priority: "medium",
      assigneeId: null,
      labelIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      commentCount: 0,
    });
  };

  return (
    <div className="flex h-full flex-col p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Issues</h1>
          <p className="text-sm text-zinc-500">Drag cards across columns</p>
        </div>
        <div className="flex items-center gap-3">
          <PresenceBar roomId={`project:${projectId}:issues`} />
          <Button size="sm" onClick={createIssue}>
            New issue
          </Button>
        </div>
      </header>
      <section className="flex flex-1 gap-3 overflow-x-auto pb-4">
        {ISSUE_STATUS_ORDER.map((status) => (
          <IssueColumn
            key={status}
            status={status}
            issues={issues}
            users={users}
            onDrop={handleDrop}
          />
        ))}
      </section>
    </div>
  );
}