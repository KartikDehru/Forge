export interface Comment {
  id: string;
  entityType: "issue" | "page";
  entityId: string;
  authorId: string;
  body: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MentionPayload {
  userId: string;
  displayName: string;
}