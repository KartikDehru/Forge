export type WorkspaceRole = "owner" | "admin" | "member" | "guest";

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  members: WorkspaceMember[];
}

export interface Project {
  id: string;
  workspaceId: string;
  /** Short uppercase key used to build issue identifiers, e.g. `PLAT-12`. */
  key: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
}
