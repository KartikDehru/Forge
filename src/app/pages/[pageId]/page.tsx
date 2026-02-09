"use client";

import { useEffect } from "react";
import { notFound } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspace-store";
import { BlockEditor } from "@/components/editor/block-editor";
import Link from "next/link";

interface PageProps {
  params: { pageId: string };
}

export default function DocumentPageRoute({ params }: PageProps) {
  const page = useWorkspaceStore((s) => s.pages.find((p) => p.id === params.pageId));
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

  useEffect(() => {
    if (page) setActiveProject(page.projectId);
  }, [page, setActiveProject]);

  if (!page) {
    notFound();
  }

  return (
    <div>
      <header className="border-b border-surface-border px-6 py-3 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          ← Dashboard
        </Link>
      </header>
      <BlockEditor page={page} />
    </div>
  );
}