"use client";

import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import type { DocumentBlock, DocumentPage } from "@/types";
import { useCollabRoom } from "@/hooks/use-collab-room";
import {
  observeBlocks,
  seedBlocksToYjs,
  updateBlockInYjs,
  insertBlockInYjs,
  removeBlockFromYjs,
} from "@/lib/collab/block-sync";
import { useWorkspaceStore } from "@/store/workspace-store";

export function useDocumentBlocks(page: DocumentPage | undefined) {
  const updatePage = useWorkspaceStore((s) => s.updatePage);
  const { room, setCursor } = useCollabRoom(page ? `page:${page.id}` : null);
  const [blocks, setBlocks] = useState<DocumentBlock[]>(page?.blocks ?? []);

  useEffect(() => {
    setBlocks(page?.blocks ?? []);
  }, [page?.id, page?.blocks]);

  useEffect(() => {
    if (!page || !room) return;

    seedBlocksToYjs(room, page.id, page.blocks);

    return observeBlocks(room, page.id, (next) => {
      setBlocks(next);
      const current =
        useWorkspaceStore.getState().pages.find((p) => p.id === page.id) ?? page;
      updatePage({
        ...current,
        blocks: next,
        updatedAt: new Date().toISOString(),
      });
    });
  }, [page, room, updatePage]);

  const updateBlock = useCallback(
    (blockId: string, patch: Partial<DocumentBlock>) => {
      if (!page || !room) return;
      updateBlockInYjs(room, page.id, blockId, patch);
      setCursor({ blockId });
    },
    [page, room, setCursor]
  );

  const addBlock = useCallback(
    (afterId: string | null, type: DocumentBlock["type"] = "paragraph") => {
      if (!page || !room) return;
      const order =
        afterId === null
          ? blocks.length
          : (blocks.find((b) => b.id === afterId)?.order ?? blocks.length) + 1;
      const block: DocumentBlock = {
        id: nanoid(10),
        type,
        content: "",
        order,
      };
      insertBlockInYjs(room, page.id, block);
    },
    [page, room, blocks]
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      if (!page || !room) return;
      removeBlockFromYjs(room, page.id, blockId);
    },
    [page, room]
  );

  return { blocks, updateBlock, addBlock, removeBlock };
}