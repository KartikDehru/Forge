"use client";

import { useState } from "react";
import type { DocumentBlock, DocumentPage } from "@/types";
import { useDocumentBlocks } from "@/hooks/use-document-blocks";
import { BlockRenderer } from "@/components/editor/block-renderer";
import { SlashMenu } from "@/components/editor/slash-menu";
import { PresenceBar } from "@/components/presence/presence-bar";

interface BlockEditorProps {
  page: DocumentPage;
}

export function BlockEditor({ page }: BlockEditorProps) {
  const { blocks, updateBlock, addBlock, removeBlock } = useDocumentBlocks(page);
  const [slashBlockId, setSlashBlockId] = useState<string | null>(null);

  const handleContentChange = (block: DocumentBlock, value: string) => {
    if (value === "__checked__") {
      updateBlock(block.id, { checked: true });
      return;
    }
    if (value === "__unchecked__") {
      updateBlock(block.id, { checked: false });
      return;
    }
    updateBlock(block.id, { content: value });
    if (value === "/") {
      setSlashBlockId(block.id);
    } else if (slashBlockId === block.id) {
      setSlashBlockId(null);
    }
  };

  const applySlash = (type: DocumentBlock["type"]) => {
    if (!slashBlockId) return;
    updateBlock(slashBlockId, { type, content: "" });
    setSlashBlockId(null);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8 border-b border-surface-border pb-4">
        <div className="mb-2 flex items-center gap-2 text-3xl">
          <span>{page.icon}</span>
          <h1 className="font-semibold">{page.title}</h1>
        </div>
        <PresenceBar roomId={`page:${page.id}`} />
      </header>

      <form className="space-y-1" onSubmit={(e) => e.preventDefault()}>
        {blocks.map((block) => (
          <div key={block.id} className="relative">
            <BlockRenderer
              block={block}
              onChange={(v) => handleContentChange(block, v)}
              onEnter={() => addBlock(block.id)}
              onBackspaceEmpty={() => removeBlock(block.id)}
              onFocus={() => setSlashBlockId(null)}
            />
            {slashBlockId === block.id && (
              <SlashMenu open onSelect={applySlash} />
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => addBlock(blocks[blocks.length - 1]?.id ?? null)}
          className="mt-4 text-sm text-zinc-500 hover:text-zinc-300"
        >
          + Add block
        </button>
      </form>
    </div>
  );
}