"use client";

import { notFound } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspace-store";
import { IssueDetail } from "@/components/issues/issue-detail";
import Link from "next/link";

interface PageProps {
  params: { issueId: string };
}

export default function IssueDetailPage({ params }: PageProps) {
  const issue = useWorkspaceStore((s) => s.issues.find((i) => i.id === params.issueId));

  if (!issue) {
    notFound();
  }

  return (
    <div>
      <header className="border-b border-surface-border px-6 py-3 text-sm text-zinc-500">
        <Link href="/issues" className="hover:text-zinc-300">
          ← Back to board
        </Link>
      </header>
      <IssueDetail issue={issue} />
    </div>
  );
}