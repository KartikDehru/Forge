import * as Y from "yjs";
import type { DocumentBlock } from "@/types";
import { normalizeBlocks } from "@/domain/blocks";
import { SEED_ORIGIN, type YjsRoom } from "@/lib/collab/yjs-room";

/**
 * Document blocks live in one Y.Map per page, keyed by block id. Each block is
 * a Y.Map whose `content` is a Y.Text, so concurrent typing inside the same
 * block merges character-by-character instead of last-writer-wins.
 */

function toYBlock(block: DocumentBlock): Y.Map<unknown> {
  const ym = new Y.Map<unknown>();
  ym.set("id", block.id);
  ym.set("type", block.type);
  ym.set("order", block.order);
  ym.set("depth", block.depth);
  const text = new Y.Text();
  text.insert(0, block.content);
  ym.set("content", text);
  if (block.checked !== undefined) ym.set("checked", block.checked);
  return ym;
}

export function yMapToBlock(ym: Y.Map<unknown>): DocumentBlock {
  const content = ym.get("content");
  const block: DocumentBlock = {
    id: ym.get("id") as string,
    type: ym.get("type") as DocumentBlock["type"],
    content: content instanceof Y.Text ? content.toString() : ((content as string) ?? ""),
    order: (ym.get("order") as number) ?? 0,
    depth: (ym.get("depth") as number) ?? 0,
  };
  const checked = ym.get("checked") as boolean | undefined;
  if (checked !== undefined) block.checked = checked;
  return block;
}

export function readBlocks(room: YjsRoom, pageId: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  room.getBlocksMap(pageId).forEach((value) => {
    if (value instanceof Y.Map) blocks.push(yMapToBlock(value));
  });
  return normalizeBlocks(blocks);
}

/** Minimal-diff text update so concurrent edits elsewhere in the string survive. */
export function applyTextDiff(text: Y.Text, next: string): void {
  const prev = text.toString();
  if (prev === next) return;
  let start = 0;
  while (start < prev.length && start < next.length && prev[start] === next[start]) start++;
  let prevEnd = prev.length;
  let nextEnd = next.length;
  while (prevEnd > start && nextEnd > start && prev[prevEnd - 1] === next[nextEnd - 1]) {
    prevEnd--;
    nextEnd--;
  }
  if (prevEnd > start) text.delete(start, prevEnd - start);
  if (nextEnd > start) text.insert(start, next.slice(start, nextEnd));
}

/**
 * Seeds the page from persisted blocks, but only when the shared document is
 * still empty - after a sync a peer's state is authoritative, and re-adding
 * persisted blocks would resurrect anything they deleted.
 */
export function seedBlocksToYjs(
  room: YjsRoom,
  pageId: string,
  blocks: readonly DocumentBlock[]
): boolean {
  const map = room.getBlocksMap(pageId);
  if (map.size > 0) return false;
  room.doc.transact(() => {
    normalizeBlocks(blocks).forEach((block) => map.set(block.id, toYBlock(block)));
  }, SEED_ORIGIN);
  return true;
}

export interface BlockChange {
  /** True when this client made the change (and so should record activity). */
  local: boolean;
}

export function observeBlocks(
  room: YjsRoom,
  pageId: string,
  onChange: (blocks: DocumentBlock[], change: BlockChange) => void
): () => void {
  const map = room.getBlocksMap(pageId);
  const handler = (_events: Y.YEvent<Y.AbstractType<unknown>>[], tr: Y.Transaction) => {
    onChange(readBlocks(room, pageId), {
      local: tr.local && tr.origin !== SEED_ORIGIN,
    });
  };
  map.observeDeep(handler);
  onChange(readBlocks(room, pageId), { local: false });
  return () => map.unobserveDeep(handler);
}

/**
 * Writes `next` into the shared map as a single transaction, touching only the
 * fields that actually differ and deleting blocks that disappeared.
 */
export function applyBlocksToYjs(
  room: YjsRoom,
  pageId: string,
  next: readonly DocumentBlock[]
): void {
  const map = room.getBlocksMap(pageId);
  room.doc.transact(() => {
    const keep = new Set(next.map((b) => b.id));
    Array.from(map.keys()).forEach((key) => {
      if (!keep.has(key)) map.delete(key);
    });
    next.forEach((block) => {
      const existing = map.get(block.id);
      if (!(existing instanceof Y.Map)) {
        map.set(block.id, toYBlock(block));
        return;
      }
      if (existing.get("type") !== block.type) existing.set("type", block.type);
      if (existing.get("order") !== block.order) existing.set("order", block.order);
      if (existing.get("depth") !== block.depth) existing.set("depth", block.depth);
      const content = existing.get("content");
      if (content instanceof Y.Text) applyTextDiff(content, block.content);
      else {
        const text = new Y.Text();
        text.insert(0, block.content);
        existing.set("content", text);
      }
      if (block.checked === undefined) {
        if (existing.has("checked")) existing.delete("checked");
      } else if (existing.get("checked") !== block.checked) {
        existing.set("checked", block.checked);
      }
    });
  });
}
