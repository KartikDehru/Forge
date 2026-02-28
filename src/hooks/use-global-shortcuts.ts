"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useCan } from "@/hooks/use-session";

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

const CHORD_WINDOW_MS = 900;

/**
 * App-wide keyboard shortcuts: Cmd/Ctrl+K palette, `c` new issue,
 * `g` then `d`/`i`/`a`/`s` navigation, and `?` for the shortcut sheet.
 * Single-key shortcuts are ignored while typing or while a dialog is open.
 */
export function useGlobalShortcuts() {
  const router = useRouter();
  const canCreate = useCan("issue.create");
  const pendingG = useRef<number>(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const ui = useUiStore.getState();

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        ui.setCommandPaletteOpen(!ui.commandPaletteOpen);
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector('[aria-modal="true"]')) return;

      const key = event.key;
      if (pendingG.current && Date.now() - pendingG.current < CHORD_WINDOW_MS) {
        pendingG.current = 0;
        const routes: Record<string, string> = { d: "/", i: "/issues", a: "/activity", s: "/settings" };
        const target = routes[key.toLowerCase()];
        if (target) {
          event.preventDefault();
          router.push(target);
          return;
        }
      }

      if (key === "g") {
        pendingG.current = Date.now();
        return;
      }
      if (key === "c" && canCreate) {
        event.preventDefault();
        const projectId = useWorkspaceStore.getState().activeProjectId;
        ui.openCreateIssue({ projectId });
        return;
      }
      if (key === "?") {
        event.preventDefault();
        ui.setShortcutsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, canCreate]);
}
