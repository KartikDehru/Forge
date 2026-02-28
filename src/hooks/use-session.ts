"use client";

import { useMemo } from "react";
import type { User, Workspace, WorkspaceRole } from "@/types";
import { can, roleOf, type Permission } from "@/domain";
import { useAuthStore } from "@/store/auth-store";
import { useWorkspaceStore } from "@/store/workspace-store";

export function useCurrentUser(): User | null {
  const userId = useAuthStore((s) => s.session?.userId);
  const users = useWorkspaceStore((s) => s.users);
  return useMemo(() => users.find((u) => u.id === userId) ?? null, [users, userId]);
}

export function useActiveWorkspace(): Workspace | null {
  const id = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  return useMemo(() => workspaces.find((w) => w.id === id) ?? null, [workspaces, id]);
}

/** Role of the signed-in user in a workspace (defaults to the active one). */
export function useRole(workspaceId?: string): WorkspaceRole | null {
  const user = useCurrentUser();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  return useMemo(() => {
    const ws = workspaces.find((w) => w.id === (workspaceId ?? activeId));
    return ws && user ? roleOf(ws, user.id) : null;
  }, [workspaces, activeId, workspaceId, user]);
}

export function useCan(permission: Permission, workspaceId?: string): boolean {
  return can(useRole(workspaceId), permission);
}

export interface MemberEntry {
  user: User;
  role: WorkspaceRole;
}

/** Members of a workspace joined with their user records (defaults to the active workspace). */
export function useMembers(workspaceId?: string): MemberEntry[] {
  const users = useWorkspaceStore((s) => s.users);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  return useMemo(() => {
    const ws = workspaces.find((w) => w.id === (workspaceId ?? activeId));
    if (!ws) return [];
    return ws.members.flatMap((m) => {
      const user = users.find((u) => u.id === m.userId);
      return user ? [{ user, role: m.role }] : [];
    });
  }, [users, workspaces, activeId, workspaceId]);
}
