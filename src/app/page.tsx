"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { ProjectBoard } from "@/components/board/project-board";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeWs = useWorkspaceStore((s) => s.activeWorkspaceId);
  const issues = useWorkspaceStore((s) => s.issues);
  const pages = useWorkspaceStore((s) => s.pages);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <p className="text-sm text-zinc-500">Redirecting to sign in…</p>
      </div>
    );
  }

  const openIssues = issues.filter((i) => i.status !== "done").length;

  return (
    <div>
      <div className="border-b border-surface-border p-6">
        <h1 className="text-2xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {openIssues} open issues · {pages.length} pages across your workspace
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/issues">
            <Button variant="secondary" size="sm">
              View issues
            </Button>
          </Link>
          <Link href={`/pages/${pages[0]?.id ?? "doc1"}`}>
            <Button variant="ghost" size="sm">
              Open product spec
            </Button>
          </Link>
        </div>
      </div>
      <ProjectBoard workspaceId={activeWs} />
      <section className="grid gap-4 px-6 pb-8 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-zinc-500">Realtime</p>
          <p className="mt-1 text-sm text-zinc-200">Yjs CRDT + awareness transport</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-zinc-500">Persistence</p>
          <p className="mt-1 text-sm text-zinc-200">localStorage workspace snapshot</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-zinc-500">Command palette</p>
          <p className="mt-1 text-sm text-zinc-200">Press ⌘K to jump anywhere</p>
        </Card>
      </section>
    </div>
  );
}