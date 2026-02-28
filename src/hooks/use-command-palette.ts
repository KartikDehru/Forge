"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileText, KanbanSquare, LayoutDashboard, Activity, Settings, Plus, type LucideIcon } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useCan } from "@/hooks/use-session";

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string;
  group: string;
  icon: LucideIcon;
  action: () => void;
}

export function useCommandPalette() {
  const router = useRouter();
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const openCreateIssue = useUiStore((s) => s.openCreateIssue);
  const openCreatePage = useUiStore((s) => s.openCreatePage);
  const pages = useWorkspaceStore((s) => s.pages);
  const issues = useWorkspaceStore((s) => s.issues);
  const projects = useWorkspaceStore((s) => s.projects);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const canCreateIssue = useCan("issue.create");
  const canCreatePage = useCan("page.create");

  const commands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    if (canCreateIssue) {
      list.push({
        id: "new-issue",
        label: "Create issue",
        shortcut: "C",
        group: "Actions",
        icon: Plus,
        action: () => openCreateIssue({ projectId: activeProjectId }),
      });
    }
    if (canCreatePage) {
      list.push({
        id: "new-page",
        label: "Create page",
        group: "Actions",
        icon: Plus,
        action: () => openCreatePage(activeProjectId),
      });
    }

    list.push(
      { id: "go-home", label: "Go to dashboard", shortcut: "G D", group: "Navigate", icon: LayoutDashboard, action: () => router.push("/") },
      { id: "go-issues", label: "Go to issues", shortcut: "G I", group: "Navigate", icon: KanbanSquare, action: () => router.push("/issues") },
      { id: "go-activity", label: "Go to activity", shortcut: "G A", group: "Navigate", icon: Activity, action: () => router.push("/activity") },
      { id: "go-settings", label: "Go to settings", shortcut: "G S", group: "Navigate", icon: Settings, action: () => router.push("/settings") }
    );

    projects
      .filter((p) => p.workspaceId === activeWorkspaceId)
      .forEach((p) =>
        list.push({
          id: `project-${p.id}`,
          label: p.name,
          hint: "Project",
          group: "Projects",
          icon: LayoutDashboard,
          action: () => router.push(`/projects/${p.id}`),
        })
      );

    pages
      .filter((p) => p.workspaceId === activeWorkspaceId)
      .forEach((p) =>
        list.push({
          id: `page-${p.id}`,
          label: p.title,
          hint: "Page",
          group: "Pages",
          icon: FileText,
          action: () => router.push(`/pages/${p.id}`),
        })
      );

    issues
      .filter((i) => i.workspaceId === activeWorkspaceId)
      .forEach((i) =>
        list.push({
          id: `issue-${i.id}`,
          label: i.title,
          hint: i.identifier,
          group: "Issues",
          icon: KanbanSquare,
          action: () => router.push(`/issues/${i.id}`),
        })
      );

    return list;
  }, [
    router,
    pages,
    issues,
    projects,
    activeWorkspaceId,
    activeProjectId,
    canCreateIssue,
    canCreatePage,
    openCreateIssue,
    openCreatePage,
  ]);

  return { open, setOpen, commands };
}
