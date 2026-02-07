"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";

export interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  group: string;
  action: () => void;
}

export function useCommandPalette() {
  const router = useRouter();
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const pages = useWorkspaceStore((s) => s.pages);
  const issues = useWorkspaceStore((s) => s.issues);
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const commands = useMemo<CommandItem[]>(() => {
    const project = projects.find((p) => p.id === activeProjectId);
    const base: CommandItem[] = [
      {
        id: "home",
        label: "Go to dashboard",
        group: "Navigation",
        shortcut: "G D",
        action: () => router.push("/"),
      },
      {
        id: "issues",
        label: "Open issues board",
        group: "Navigation",
        shortcut: "G I",
        action: () => router.push("/issues"),
      },
    ];

    if (project) {
      base.push({
        id: "project",
        label: `Project: ${project.name}`,
        group: "Navigation",
        action: () => router.push(`/projects/${project.id}`),
      });
    }

    pages.forEach((p) => {
      base.push({
        id: `page-${p.id}`,
        label: `Page: ${p.title}`,
        group: "Documents",
        action: () => router.push(`/pages/${p.id}`),
      });
    });

    issues.slice(0, 8).forEach((i) => {
      base.push({
        id: `issue-${i.id}`,
        label: `${i.identifier} ${i.title}`,
        group: "Issues",
        action: () => router.push(`/issues/${i.id}`),
      });
    });

    return base;
  }, [router, pages, issues, projects, activeProjectId]);

  return { open, setOpen, commands };
}