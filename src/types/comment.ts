export interface Comment {
  id: string;
  workspaceId: string;
  entityType: "issue" | "page";
  entityId: string;
  authorId: string;
  body: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
}
