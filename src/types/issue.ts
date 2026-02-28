export type IssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "canceled";

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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}

export interface IssueLabel {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
}
