"use client";

import { useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Card } from "@/components/ui/card";
import { IssueBoard } from "@/components/issues/issue-board";
import { formatRelativeTime } from "@/lib/utils";

interface PageProps {
  params: { projectId: string };
}

export default function ProjectPage({ params }: PageProps) {
  const project = useWorkspaceStore((s) => s.projects.find((p) => p.id === params.projectId));
  const pages = useWorkspaceStore((s) => s.pages.filter((p) => p.projectId === params.projectId));
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

  useEffect(() => {
    if (project) setActiveProject(project.id);
  }, [project, setActiveProject]);

  if (!project) {
    notFound();
  }

  return (
    <div>
      <section className="border-b border-surface-border p-6">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-2xl font-semibold">{project.name}</h1>
        </div>
        <p className="text-sm text-zinc-400">{project.description}</p>
      </section>

      <section className="grid gap-4 p-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">Documents</h2>
          <ul className="space-y-2">
            {pages.map((page) => (
              <li key={page.id}>
                <Link
                  href={`/pages/${page.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-surface-elevated"
                >
                  <span>
                    {page.icon} {page.title}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatRelativeTime(page.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="overflow-hidden p-0">
          <IssueBoard projectId={project.id} />
        </Card>
      </section>
    </div>
  );
}