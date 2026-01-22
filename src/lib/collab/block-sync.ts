import type { DocumentBlock } from "@/types";
import type { YjsRoom } from "@/lib/collab/yjs-room";
import * as Y from "yjs";

export function seedBlocksToYjs(
  room: YjsRoom,
  pageId: string,
  blocks: DocumentBlock[]
): void {
  const map = room.getBlocksMap(pageId);
  room.doc.transact(() => {
    blocks.forEach((block) => {
      if (!map.has(block.id)) {
        map.set(block.id, blockToYMap(block));
      }
    });
  });
}

function blockToYMap(block: DocumentBlock): Y.Map<unknown> {
  const ym = new Y.Map();
  ym.set("id", block.id);
  ym.set("type", block.type);
  ym.set("content", block.content);
  ym.set("order", block.order);
  if (block.checked !== undefined) ym.set("checked", block.checked);
  return ym;
}

export function yMapToBlock(ym: Y.Map<unknown>): DocumentBlock {
  return {
    id: ym.get("id") as string,
    type: ym.get("type") as DocumentBlock["type"],
    content: (ym.get("content") as string) ?? "",
    order: (ym.get("order") as number) ?? 0,
    checked: ym.get("checked") as boolean | undefined,
  };
}

export function observeBlocks(
  room: YjsRoom,
  pageId: string,
  onChange: (blocks: DocumentBlock[]) => void
): () => void {
  const map = room.getBlocksMap(pageId);

  const emit = () => {
    const blocks: DocumentBlock[] = [];
    map.forEach((value) => {
      if (value instanceof Y.Map) {
        blocks.push(yMapToBlock(value));
      }
    });
    blocks.sort((a, b) => a.order - b.order);
    onChange(blocks);
  };

  const handler = () => emit();
  map.observeDeep(handler);
  emit();

  return () => map.unobserveDeep(handler);
}

export function updateBlockInYjs(
  room: YjsRoom,
  pageId: string,
  blockId: string,
  patch: Partial<DocumentBlock>
): void {
  const map = room.getBlocksMap(pageId);
  const existing = map.get(blockId);
  if (!(existing instanceof Y.Map)) return;
  room.doc.transact(() => {
    if (patch.content !== undefined) existing.set("content", patch.content);
    if (patch.type !== undefined) existing.set("type", patch.type);
    if (patch.order !== undefined) existing.set("order", patch.order);
    if (patch.checked !== undefined) existing.set("checked", patch.checked);
  });
}

export function insertBlockInYjs(
  room: YjsRoom,
  pageId: string,
  block: DocumentBlock
): void {
  const map = room.getBlocksMap(pageId);
  room.doc.transact(() => {
    map.set(block.id, blockToYMap(block));
  });
}

export function removeBlockFromYjs(
  room: YjsRoom,
  pageId: string,
  blockId: string
): void {
  const map = room.getBlocksMap(pageId);
  room.doc.transact(() => {
    map.delete(blockId);
  });
}