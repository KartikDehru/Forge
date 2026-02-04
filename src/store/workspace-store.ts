"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Workspace,
  Project,
  DocumentPage,
  Issue,
  IssueLabel,
  Comment,
  User,
} from "@/types";
import { loadPersistedState, savePersistedState } from "@/lib/persistence";

interface WorkspaceState {
  users: User[];
  workspaces: Workspace[];
  projects: Project[];
  pages: DocumentPage[];
  issues: Issue[];
  labels: IssueLabel[];
  comments: Comment[];
  activeWorkspaceId: string;
  activeProjectId: string;
  hydrate: () => void;
  setActiveWorkspace: (id: string) => void;
  setActiveProject: (id: string) => void;
  updatePage: (page: DocumentPage) => void;
  updateIssue: (issue: Issue) => void;
  moveIssue: (issueId: string, status: Issue["status"]) => void;
  addComment: (comment: Comment) => void;
  addIssue: (issue: Issue) => void;
}

function syncToLocalStorage(state: WorkspaceState): void {
  savePersistedState({
    users: state.users,
    workspaces: state.workspaces,
    projects: state.projects,
    pages: state.pages,
    issues: state.issues,
    labels: state.labels,
    comments: state.comments,
    activeWorkspaceId: state.activeWorkspaceId,
    activeProjectId: state.activeProjectId,
    version: 1,
  });
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...loadPersistedState(),
      hydrate: () => set(loadPersistedState()),
      setActiveWorkspace: (id) => {
        set({ activeWorkspaceId: id });
        syncToLocalStorage(get());
      },
      setActiveProject: (id) => {
        set({ activeProjectId: id });
        syncToLocalStorage(get());
      },
      updatePage: (page) => {
        set((s) => ({
          pages: s.pages.map((p) => (p.id === page.id ? page : p)),
        }));
        syncToLocalStorage(get());
      },
      updateIssue: (issue) => {
        set((s) => ({
          issues: s.issues.map((i) => (i.id === issue.id ? issue : i)),
        }));
        syncToLocalStorage(get());
      },
      moveIssue: (issueId, status) => {
        set((s) => ({
          issues: s.issues.map((i) =>
            i.id === issueId
              ? { ...i, status, updatedAt: new Date().toISOString() }
              : i
          ),
        }));
        syncToLocalStorage(get());
      },
      addComment: (comment) => {
        set((s) => {
          const comments = [...s.comments, comment];
          const issues =
            comment.entityType === "issue"
              ? s.issues.map((i) =>
                  i.id === comment.entityId
                    ? { ...i, commentCount: i.commentCount + 1 }
                    : i
                )
              : s.issues;
          return { comments, issues };
        });
        syncToLocalStorage(get());
      },
      addIssue: (issue) => {
        set((s) => ({ issues: [...s.issues, issue] }));
        syncToLocalStorage(get());
      },
    }),
    {
      name: "collab-workspace-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        users: state.users,
        workspaces: state.workspaces,
        projects: state.projects,
        pages: state.pages,
        issues: state.issues,
        labels: state.labels,
        comments: state.comments,
        activeWorkspaceId: state.activeWorkspaceId,
        activeProjectId: state.activeProjectId,
      }),
    }
  )
);