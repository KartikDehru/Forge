export interface Workspace {
  id: string;
  name: string;
  slug: string;
  icon: string;
  createdAt: string;
  memberIds: string[];
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
}