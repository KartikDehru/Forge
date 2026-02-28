"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useRole } from "@/hooks/use-session";
import { BlockEditor } from "@/components/editor/block-editor";
import { MissingState, NoAccessState } from "@/components/layout/state-views";

export default function DocumentPageRoute({ params }: { params: { pageId: string } }) {
  const page = useWorkspaceStore((s) => s.pages.find((p) => p.id === params.pageId));
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const role = useRole(page?.workspaceId);

  useEffect(() => {
    if (page && role) setActiveProject(page.projectId);
  }, [page, role, setActiveProject]);

  if (!page) return <MissingState what="page" />;
  if (!role) return <NoAccessState what="page" />;
  return <BlockEditor key={page.id} page={page} />;
}
