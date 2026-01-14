export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "bullet"
  | "numbered"
  | "todo"
  | "quote"
  | "code"
  | "divider";

export interface DocumentBlock {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  order: number;
}

export interface DocumentPage {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  icon: string;
  blocks: DocumentBlock[];
  updatedAt: string;
  updatedBy: string;
}