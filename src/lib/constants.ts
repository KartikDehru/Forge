import type { IssuePriority, IssueStatus } from "@/types";

export const PRODUCT_NAME = "Forge";
export const PRODUCT_TAGLINE = "Realtime docs and issue tracking for product teams.";

export const STORE_KEY = "forge:workspace";
export const STORE_VERSION = 2;
export const SESSION_KEY = "forge:session";

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  canceled: "Canceled",
};

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  none: "No priority",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/** Hex colors per status, shared by the board, detail view and filters. */
export const STATUS_COLORS: Record<IssueStatus, string> = {
  backlog: "#8a8274",
  todo: "#c9c1b0",
  in_progress: "#e9a23b",
  in_review: "#5b9bd1",
  done: "#8bb55a",
  canceled: "#6c655a",
};

export const PRIORITY_COLORS: Record<IssuePriority, string> = {
  none: "#6c655a",
  low: "#8a8274",
  medium: "#c9c1b0",
  high: "#e9a23b",
  urgent: "#e5604d",
};
