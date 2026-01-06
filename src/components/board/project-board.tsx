"use client";

import Link from "next/link";
import type { Project } from "@/types";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Card } from "@/components/ui/card";
import { PresenceStack } from "@/components/presence/presence-stack";
import { useCollabRoom } from "@/hooks/use-collab-room";

interface ProjectBoardProps {
  workspaceId: string;
}

export function ProjectBoard({ workspaceId }: ProjectBoardProps) {
  const projects = useWorkspaceStore((s) =>
    s.projects.filter((p) => p.workspaceId === workspaceId)
  );
  const pages = useWorkspaceStore((s) => s.pages);
  const issues = useWorkspaceStore((s) => s.issues);
  const { peers } = useCollabRoom(`workspace:${workspaceId}`);

  return (
    <div className="p-6">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Project boards</h1>
          <p className="text-sm text-zinc-500">Documents, issues, and live presence</p>
        </div>
        <PresenceStack peers={peers} />
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            pageCount={pages.filter((p) => p.projectId === project.id).length}
            issueCount={issues.filter((i) => i.projectId === project.id).length}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  pageCount,
  issueCount,
}: {
  project: Project;
  pageCount: number;
  issueCount: number;
}) {
  return (
    <Card className="p-4 transition hover:border-zinc-600">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <h2 className="font-semibold text-zinc-100">{project.name}</h2>
      </div>
      <p className="mb-4 text-sm text-zinc-400">{project.description}</p>
      <div className="flex gap-3 text-xs text-zinc-500">
        <span>{pageCount} pages</span>
        <span>{issueCount} issues</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/30"
        >
          Open board
        </Link>
        <Link
          href="/issues"
          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-zinc-300 hover:bg-surface"
        >
          Issues
        </Link>
      </div>
    </Card>
  );
}