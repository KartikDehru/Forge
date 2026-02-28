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
  /** Position in the flat, depth-first ordered list. */
  order: number;
  /** Nesting level. 0 is top level; a block may be at most one deeper than the block before it. */
  depth: number;
}

export interface DocumentPage {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  blocks: DocumentBlock[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}
