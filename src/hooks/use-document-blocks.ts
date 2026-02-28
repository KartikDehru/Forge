"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { BlockType, DocumentBlock, DocumentPage } from "@/types";
import {
  changeBlockType,
  createBlock,
  insertBlockAfter,
  updateBlockContent,
  deleteBlock,
  indentBlock,
  mergeWithPrevious,
  moveBlock,
  normalizeBlocks,
  outdentBlock,
  reorderBlock,
  splitBlock,
  type BlockEdit,
  type BlockResult,
} from "@/domain/blocks";
import type { DomainError } from "@/domain/result";
import { useCollabRoom } from "@/hooks/use-collab-room";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useCurrentUser } from "@/hooks/use-session";
import { applyBlocksToYjs, observeBlocks, seedBlocksToYjs } from "@/lib/collab/block-sync";
import { useWorkspaceStore } from "@/store/workspace-store";

const PERSIST_DEBOUNCE_MS = 500;

export interface FocusRequest {
  id: string;
  caret?: number;
  nonce: number;
}

export type SaveState = "saved" | "saving";

/**
 * Binds one page to a shared Yjs document.
 *
 * - Edits are computed by the pure functions in `domain/blocks`, then written to
 *   Yjs in one transaction, which syncs to peers.
 * - Persistence to the workspace store is debounced and only fires for changes
 *   made by this client, so a peer's tab never re-records their edits.
 */
export function useDocumentBlocks(page: DocumentPage, readOnly: boolean) {
  const user = useCurrentUser();
  const savePageBlocks = useWorkspaceStore((s) => s.savePageBlocks);
  const { room, peers, status, setCursor, reconnect } = useCollabRoom(`page:${page.id}`);
  const [blocks, setBlocks] = useState<DocumentBlock[]>(() => normalizeBlocks(page.blocks));
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const blocksRef = useRef(blocks);
  const initialRef = useRef(page.blocks);
  const userId = user?.id;

  const persist = useDebouncedCallback((next: DocumentBlock[]) => {
    if (!userId) return;
    const result = savePageBlocks(userId, page.id, next, { recordActivity: true });
    if (result.ok) setSaveState("saved");
  }, PERSIST_DEBOUNCE_MS);

  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    setReady(false);

    // Wait for a peer's state before seeding, so an already-open document is
    // never overwritten by this tab's older persisted copy.
    room.whenSynced().then(() => {
      if (cancelled) return;
      seedBlocksToYjs(room, page.id, initialRef.current);
      stop = observeBlocks(room, page.id, (next, change) => {
        blocksRef.current = next;
        setBlocks(next);
        if (change.local && !readOnly) {
          setSaveState("saving");
          persist.call(next);
        }
      });
      setReady(true);
    });

    return () => {
      cancelled = true;
      stop?.();
    };
    // `persist.call` is stable; readOnly changes shouldn't rebuild the subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, page.id]);

  const request = useCallback((edit: BlockEdit) => {
    if (edit.focusId) {
      setFocusRequest({ id: edit.focusId, caret: edit.caret, nonce: Date.now() + Math.random() });
    }
  }, []);

  const commit = useCallback(
    (result: BlockResult): DomainError | null => {
      if (!room || !ready || readOnly) return null;
      if (!result.ok) return result.error;
      applyBlocksToYjs(room, page.id, result.value.blocks);
      request(result.value);
      return null;
    },
    [room, ready, page.id, readOnly, request]
  );

  const updateContent = useCallback(
    (blockId: string, content: string) => {
      if (!room || !ready || readOnly) return;
      const next = blocksRef.current.map((b) => (b.id === blockId ? { ...b, content } : b));
      applyBlocksToYjs(room, page.id, next);
    },
    [room, ready, page.id, readOnly]
  );

  const toggleChecked = useCallback(
    (blockId: string, checked: boolean) => {
      if (!room || !ready || readOnly) return;
      applyBlocksToYjs(
        room,
        page.id,
        blocksRef.current.map((b) => (b.id === blockId ? { ...b, checked } : b))
      );
    },
    [room, ready, page.id, readOnly]
  );

  const ops = {
    split: (id: string, offset: number) => commit(splitBlock(blocksRef.current, id, offset, nanoid(8))),
    mergeUp: (id: string) => commit(mergeWithPrevious(blocksRef.current, id)),
    remove: (id: string) => commit(deleteBlock(blocksRef.current, id, "cascade", nanoid(8))),
    indent: (id: string) => commit(indentBlock(blocksRef.current, id)),
    outdent: (id: string) => commit(outdentBlock(blocksRef.current, id)),
    move: (id: string, direction: "up" | "down") =>
      commit(moveBlock(blocksRef.current, id, direction)),
    reorder: (id: string, targetId: string, position: "before" | "after") =>
      commit(reorderBlock(blocksRef.current, id, targetId, position)),
    setType: (id: string, type: BlockType) =>
      commit(changeBlockType(blocksRef.current, id, type)),
    /** Applies a slash-menu choice: clears the `/query` text, converts, and continues after dividers. */
    applySlash: (id: string, type: BlockType) => {
      const cleared = updateBlockContent(blocksRef.current, id, "");
      if (!cleared.ok) return cleared.error;
      const converted = changeBlockType(cleared.value, id, type);
      if (!converted.ok || type !== "divider") return commit(converted);
      return commit(insertBlockAfter(converted.value.blocks, id, createBlock(nanoid(8))));
    },
    append: () => {
      const last = blocksRef.current[blocksRef.current.length - 1];
      if (last && last.type === "paragraph" && last.content === "") {
        request({ blocks: blocksRef.current, focusId: last.id, caret: 0 });
        return null;
      }
      if (!room || !ready || readOnly) return null;
      const block = createBlock(nanoid(8));
      applyBlocksToYjs(room, page.id, normalizeBlocks([...blocksRef.current, { ...block, order: blocksRef.current.length }]));
      request({ blocks: [], focusId: block.id, caret: 0 });
      return null;
    },
  };

  return {
    blocks,
    ready,
    saveState,
    peers,
    localClientId: room?.clientId ?? null,
    status,
    reconnect,
    focusRequest,
    setCursor,
    updateContent,
    toggleChecked,
    ops,
    flush: persist.flush,
  };
}
