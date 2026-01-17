export type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type IssuePriority = "none" | "low" | "medium" | "high" | "urgent";

export interface Issue {
  id: string;
  projectId: string;
  workspaceId: string;
  identifier: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId: string | null;
  labelIds: string[];
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}

export interface IssueLabel {
  id: string;
  name: string;
  color: string;
}