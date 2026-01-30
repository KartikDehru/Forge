import { STORAGE_KEY } from "@/lib/constants";
import type {
  User,
  Workspace,
  Project,
  DocumentPage,
  Issue,
  IssueLabel,
  Comment,
} from "@/types";
import {
  SAMPLE_USERS,
  SAMPLE_WORKSPACES,
  SAMPLE_PROJECTS,
  SAMPLE_PAGES,
  SAMPLE_ISSUES,
  SAMPLE_LABELS,
  SAMPLE_COMMENTS,
} from "@/lib/sample-data";

export interface PersistedState {
  users: User[];
  workspaces: Workspace[];
  projects: Project[];
  pages: DocumentPage[];
  issues: Issue[];
  labels: IssueLabel[];
  comments: Comment[];
  activeWorkspaceId: string;
  activeProjectId: string;
  version: number;
}

const DEFAULT_STATE: PersistedState = {
  users: SAMPLE_USERS,
  workspaces: SAMPLE_WORKSPACES,
  projects: SAMPLE_PROJECTS,
  pages: SAMPLE_PAGES,
  issues: SAMPLE_ISSUES,
  labels: SAMPLE_LABELS,
  comments: SAMPLE_COMMENTS,
  activeWorkspaceId: "ws1",
  activeProjectId: "p1",
  version: 1,
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadPersistedState(): PersistedState {
  if (!isBrowser()) {
    return structuredClone(DEFAULT_STATE);
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw) as PersistedState;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function savePersistedState(state: PersistedState): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota or private mode
  }
}

export function resetPersistedState(): PersistedState {
  if (isBrowser()) {
    localStorage.removeItem(STORAGE_KEY);
  }
  return structuredClone(DEFAULT_STATE);
}