"use client";

import { useEffect, useMemo } from "react";
import { FolderKanban } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { IssueBoard } from "@/components/issues/issue-board";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";

export default function IssuesPage() {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const scoped = useMemo(() => projects.filter((p) => p.workspaceId === workspaceId), [projects, workspaceId]);
  const project = scoped.find((p) => p.id === activeProjectId) ?? scoped[0];

  useEffect(() => {
    if (project && project.id !== activeProjectId) setActiveProject(project.id);
  }, [project, activeProjectId, setActiveProject]);

  if (!project) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20">
        <EmptyState icon={FolderKanban} title="No projects in this workspace" description="Projects group issues and pages. Ask an admin to create one." />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-5 py-2">
        <label htmlFor="board-project" className="text-xs text-ink-subtle">
          Project
        </label>
        <Select
          id="board-project"
          value={project.id}
          onChange={(e) => setActiveProject(e.target.value)}
          className="w-52"
        >
          {scoped.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.key})
            </option>
          ))}
        </Select>
      </div>
      <div className="min-h-0 flex-1">
        <IssueBoard key={project.id} projectId={project.id} />
      </div>
    </div>
  );
}
