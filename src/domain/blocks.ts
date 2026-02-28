import type { BlockType, DocumentBlock } from "@/types";
import { domainError, err, ok, type DomainError, type Result } from "./result";

/**
 * Block model: a flat, depth-first ordered list where `depth` encodes nesting.
 * That shape syncs cleanly through a Yjs map keyed by block id, while
 * `buildTree` recovers the hierarchy when a consumer wants it.
 *
 * Invariants maintained by `normalizeBlocks` (and therefore by every operation):
 *  - `order` equals the array index
 *  - the first block has depth 0
 *  - a block is at most one level deeper than the block before it
 *  - depth never exceeds `MAX_DEPTH`
 */
export const MAX_DEPTH = 6;

export interface BlockEdit {
  blocks: DocumentBlock[];
  /** Block that should receive focus after the edit. */
  focusId: string | null;
  /** Caret position inside `focusId`; defaults to the end of the text. */
  caret?: number;
}

export type BlockResult = Result<BlockEdit, DomainError>;

const LIST_TYPES: ReadonlySet<BlockType> = new Set<BlockType>(["bullet", "numbered", "todo"]);

export function isListType(type: BlockType): boolean {
  return LIST_TYPES.has(type);
}

export interface BlockNode {
  block: DocumentBlock;
  children: BlockNode[];
}

export function createBlock(
  id: string,
  type: BlockType = "paragraph",
  content = "",
  depth = 0
): DocumentBlock {
  const block: DocumentBlock = { id, type, content, order: 0, depth };
  if (type === "todo") block.checked = false;
  return block;
}

/** Re-establishes invariants for a list that is already in the intended order. */
export function reindex(sorted: readonly DocumentBlock[]): DocumentBlock[] {
  const out: DocumentBlock[] = [];
  sorted.forEach((block, index) => {
    const prev = out[index - 1];
    const maxAllowed = prev ? Math.min(prev.depth + 1, MAX_DEPTH) : 0;
    const wanted = Math.max(0, Math.floor(block.depth ?? 0));
    out.push({ ...block, order: index, depth: Math.min(wanted, maxAllowed) });
  });
  return out;
}

/** Sorts by `order` (ties broken by id so concurrent edits converge) and reindexes. */
export function normalizeBlocks(input: readonly DocumentBlock[]): DocumentBlock[] {
  return reindex(
    [...input].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id))
  );
}

function indexOfBlock(blocks: readonly DocumentBlock[], id: string): number {
  return blocks.findIndex((b) => b.id === id);
}

function notFound(id: string): DomainError {
  return domainError("NOT_FOUND", `Block ${id} does not exist.`);
}

/** Exclusive end index of the subtree rooted at `index`. */
export function subtreeEnd(blocks: readonly DocumentBlock[], index: number): number {
  const depth = blocks[index].depth;
  let end = index + 1;
  while (end < blocks.length && blocks[end].depth > depth) end++;
  return end;
}

export function hasChildren(blocks: readonly DocumentBlock[], id: string): boolean {
  const i = indexOfBlock(blocks, id);
  return i !== -1 && i + 1 < blocks.length && blocks[i + 1].depth > blocks[i].depth;
}

function shiftDepth(
  blocks: readonly DocumentBlock[],
  start: number,
  end: number,
  delta: number
): DocumentBlock[] {
  return blocks.map((b, i) =>
    i >= start && i < end ? { ...b, depth: b.depth + delta } : b
  );
}

export function buildTree(input: readonly DocumentBlock[]): BlockNode[] {
  const blocks = normalizeBlocks(input);
  const roots: BlockNode[] = [];
  const stack: BlockNode[] = [];
  for (const block of blocks) {
    const node: BlockNode = { block, children: [] };
    while (stack.length > block.depth) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push(node);
  }
  return roots;
}

export function flattenTree(nodes: readonly BlockNode[]): DocumentBlock[] {
  const out: DocumentBlock[] = [];
  const walk = (list: readonly BlockNode[], depth: number) => {
    for (const node of list) {
      out.push({ ...node.block, depth });
      walk(node.children, depth + 1);
    }
  };
  walk(nodes, 0);
  return reindex(out);
}

/** 1-based numbers for `numbered` blocks, restarting after any interruption at that depth. */
export function numberingFor(blocks: readonly DocumentBlock[]): Map<string, number> {
  const result = new Map<string, number>();
  const counters: number[] = [];
  for (const block of blocks) {
    counters.length = Math.min(counters.length, block.depth + 1);
    if (block.type === "numbered") {
      counters[block.depth] = (counters[block.depth] ?? 0) + 1;
      result.set(block.id, counters[block.depth]);
    } else {
      counters[block.depth] = 0;
    }
  }
  return result;
}

/** Guarantees at least one editable block. `blocks` must already be in document order. */
export function ensureNonEmpty(
  blocks: readonly DocumentBlock[],
  fallbackId: string
): DocumentBlock[] {
  return blocks.length ? reindex(blocks) : [createBlock(fallbackId)];
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/** Inserts `block` as a sibling after `afterId`'s subtree (or at the end when null). */
export function insertBlockAfter(
  input: readonly DocumentBlock[],
  afterId: string | null,
  block: DocumentBlock
): BlockResult {
  const blocks = normalizeBlocks(input);
  if (afterId === null) {
    const next = reindex([...blocks, { ...block, depth: 0 }]);
    return ok({ blocks: next, focusId: block.id, caret: 0 });
  }
  const i = indexOfBlock(blocks, afterId);
  if (i === -1) return err(notFound(afterId));
  const at = subtreeEnd(blocks, i);
  const placed = { ...block, depth: blocks[i].depth };
  const next = reindex([...blocks.slice(0, at), placed, ...blocks.slice(at)]);
  return ok({ blocks: next, focusId: block.id, caret: 0 });
}

export type DeleteMode = "cascade" | "promote";

/**
 * Removes a block. `cascade` removes its descendants too; `promote` keeps them
 * and outdents them by one level. Deleting the last block leaves one empty paragraph.
 */
export function deleteBlock(
  input: readonly DocumentBlock[],
  id: string,
  mode: DeleteMode = "cascade",
  fallbackId = `${id}_empty`
): BlockResult {
  const blocks = normalizeBlocks(input);
  const i = indexOfBlock(blocks, id);
  if (i === -1) return err(notFound(id));
  const end = subtreeEnd(blocks, i);

  let next: DocumentBlock[];
  if (mode === "cascade") {
    next = [...blocks.slice(0, i), ...blocks.slice(end)];
  } else {
    const children = shiftDepth(blocks, i + 1, end, -1).slice(i + 1, end);
    next = [...blocks.slice(0, i), ...children, ...blocks.slice(end)];
  }
  next = ensureNonEmpty(next, fallbackId);

  const focusIndex = Math.min(Math.max(i - 1, 0), next.length - 1);
  const focus = next[focusIndex];
  return ok({
    blocks: next,
    focusId: focus.id,
    caret: i > 0 ? focus.content.length : 0,
  });
}

/** Moves a block (with its subtree) past its previous / next sibling. */
export function moveBlock(
  input: readonly DocumentBlock[],
  id: string,
  direction: "up" | "down"
): BlockResult {
  const blocks = normalizeBlocks(input);
  const i = indexOfBlock(blocks, id);
  if (i === -1) return err(notFound(id));
  const depth = blocks[i].depth;
  const end = subtreeEnd(blocks, i);
  const subtree = blocks.slice(i, end);

  if (direction === "up") {
    let k = i - 1;
    while (k >= 0 && blocks[k].depth > depth) k--;
    if (k < 0 || blocks[k].depth !== depth) {
      return err(domainError("BLOCK_BOUNDARY", "Already the first block at this level."));
    }
    const next = reindex([
      ...blocks.slice(0, k),
      ...subtree,
      ...blocks.slice(k, i),
      ...blocks.slice(end),
    ]);
    return ok({ blocks: next, focusId: id });
  }

  if (end >= blocks.length || blocks[end].depth !== depth) {
    return err(domainError("BLOCK_BOUNDARY", "Already the last block at this level."));
  }
  const siblingEnd = subtreeEnd(blocks, end);
  const next = reindex([
    ...blocks.slice(0, i),
    ...blocks.slice(end, siblingEnd),
    ...subtree,
    ...blocks.slice(siblingEnd),
  ]);
  return ok({ blocks: next, focusId: id });
}

/** Drag-and-drop reorder: relocates `id`'s subtree before/after `targetId`'s. */
export function reorderBlock(
  input: readonly DocumentBlock[],
  id: string,
  targetId: string,
  position: "before" | "after"
): BlockResult {
  const blocks = normalizeBlocks(input);
  const s = indexOfBlock(blocks, id);
  if (s === -1) return err(notFound(id));
  const t = indexOfBlock(blocks, targetId);
  if (t === -1) return err(notFound(targetId));
  const e = subtreeEnd(blocks, s);
  if (t >= s && t < e) {
    return err(
      domainError("BLOCK_CYCLE", "A block can't be dropped inside itself.")
    );
  }

  const delta = blocks[t].depth - blocks[s].depth;
  const maxDepth = Math.max(...blocks.slice(s, e).map((b) => b.depth)) + delta;
  if (maxDepth > MAX_DEPTH) {
    return err(domainError("BLOCK_DEPTH", `Nesting is limited to ${MAX_DEPTH} levels.`));
  }

  const moving = shiftDepth(blocks, s, e, delta).slice(s, e);
  const rest = [...blocks.slice(0, s), ...blocks.slice(e)];
  let insertAt = position === "before" ? t : subtreeEnd(blocks, t);
  if (insertAt > s) insertAt -= e - s;
  const next = reindex([
    ...rest.slice(0, insertAt),
    ...moving,
    ...rest.slice(insertAt),
  ]);
  return ok({ blocks: next, focusId: id });
}

export function indentBlock(input: readonly DocumentBlock[], id: string): BlockResult {
  const blocks = normalizeBlocks(input);
  const i = indexOfBlock(blocks, id);
  if (i === -1) return err(notFound(id));
  if (i === 0) {
    return err(domainError("BLOCK_BOUNDARY", "The first block can't be indented."));
  }
  const prev = blocks[i - 1];
  if (blocks[i].depth > prev.depth) {
    return err(domainError("BLOCK_DEPTH", "Already nested under the block above."));
  }
  const end = subtreeEnd(blocks, i);
  const deepest = Math.max(...blocks.slice(i, end).map((b) => b.depth));
  if (deepest + 1 > MAX_DEPTH) {
    return err(domainError("BLOCK_DEPTH", `Nesting is limited to ${MAX_DEPTH} levels.`));
  }
  return ok({ blocks: reindex(shiftDepth(blocks, i, end, 1)), focusId: id });
}

export function outdentBlock(input: readonly DocumentBlock[], id: string): BlockResult {
  const blocks = normalizeBlocks(input);
  const i = indexOfBlock(blocks, id);
  if (i === -1) return err(notFound(id));
  if (blocks[i].depth === 0) {
    return err(domainError("BLOCK_DEPTH", "Already at the top level."));
  }
  const end = subtreeEnd(blocks, i);
  return ok({ blocks: reindex(shiftDepth(blocks, i, end, -1)), focusId: id });
}

/**
 * Enter key behaviour.
 *  - empty list item: outdent, or turn into a paragraph at top level
 *  - caret at start of non-empty text: insert an empty block above
 *  - otherwise: split the text at the caret; the tail becomes a new block
 *    (a first child when the block already has children)
 */
export function splitBlock(
  input: readonly DocumentBlock[],
  id: string,
  offset: number,
  newId: string
): BlockResult {
  const blocks = normalizeBlocks(input);
  const i = indexOfBlock(blocks, id);
  if (i === -1) return err(notFound(id));
  const block = blocks[i];

  if (block.type === "divider") {
    return insertBlockAfter(blocks, id, createBlock(newId));
  }

  if (isListType(block.type) && block.content === "") {
    if (block.depth > 0) return outdentBlock(blocks, id);
    const next = blocks.map((b, idx) =>
      idx === i ? { ...b, type: "paragraph" as const, checked: undefined } : b
    );
    return ok({ blocks: reindex(next), focusId: id, caret: 0 });
  }

  const at = Math.min(Math.max(offset, 0), block.content.length);
  const continuation: BlockType = isListType(block.type) ? block.type : "paragraph";

  if (at === 0 && block.content.length > 0) {
    const above = createBlock(newId, continuation, "", block.depth);
    const next = reindex([...blocks.slice(0, i), above, ...blocks.slice(i)]);
    return ok({ blocks: next, focusId: id, caret: 0 });
  }

  const head = block.content.slice(0, at);
  const tail = block.content.slice(at);
  const childDepth = hasChildren(blocks, id) ? block.depth + 1 : block.depth;
  const created = createBlock(newId, continuation, tail, childDepth);
  const updated = { ...block, content: head };
  const next = reindex([
    ...blocks.slice(0, i),
    updated,
    created,
    ...blocks.slice(i + 1),
  ]);
  return ok({ blocks: next, focusId: newId, caret: 0 });
}

/**
 * Backspace at the very start of a block.
 *  - non-paragraph: becomes a paragraph first
 *  - after a divider: removes the divider
 *  - otherwise: appends its text to the previous block
 */
export function mergeWithPrevious(
  input: readonly DocumentBlock[],
  id: string
): BlockResult {
  const blocks = normalizeBlocks(input);
  const i = indexOfBlock(blocks, id);
  if (i === -1) return err(notFound(id));
  const block = blocks[i];

  if (block.type !== "paragraph") {
    const next = blocks.map((b, idx) =>
      idx === i ? { ...b, type: "paragraph" as const, checked: undefined } : b
    );
    return ok({ blocks: reindex(next), focusId: id, caret: 0 });
  }
  if (i === 0) {
    return err(domainError("BLOCK_BOUNDARY", "Nothing above to merge into."));
  }

  const prev = blocks[i - 1];
  if (prev.type === "divider") {
    const next = [...blocks.slice(0, i - 1), ...blocks.slice(i)];
    return ok({ blocks: reindex(next), focusId: id, caret: 0 });
  }

  const caret = prev.content.length;
  const merged = { ...prev, content: prev.content + block.content };
  const next = reindex([
    ...blocks.slice(0, i - 1),
    merged,
    ...blocks.slice(i + 1),
  ]);
  return ok({ blocks: next, focusId: prev.id, caret });
}

export function changeBlockType(
  input: readonly DocumentBlock[],
  id: string,
  type: BlockType
): BlockResult {
  const blocks = normalizeBlocks(input);
  const i = indexOfBlock(blocks, id);
  if (i === -1) return err(notFound(id));
  const next = blocks.map((b, idx) => {
    if (idx !== i) return b;
    const changed: DocumentBlock = {
      ...b,
      type,
      content: type === "divider" ? "" : b.content,
    };
    if (type === "todo") changed.checked = b.checked ?? false;
    else delete changed.checked;
    return changed;
  });
  return ok({ blocks: next, focusId: id, caret: 0 });
}

export function updateBlockContent(
  input: readonly DocumentBlock[],
  id: string,
  content: string
): Result<DocumentBlock[], DomainError> {
  const i = indexOfBlock(input, id);
  if (i === -1) return err(notFound(id));
  return ok(input.map((b, idx) => (idx === i ? { ...b, content } : b)));
}
