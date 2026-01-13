"use client";

import type { DocumentBlock } from "@/types";
import { cn } from "@/lib/utils";

const OPTIONS: { type: DocumentBlock["type"]; label: string }[] = [
  { type: "paragraph", label: "Text" },
  { type: "heading1", label: "Heading 1" },
  { type: "heading2", label: "Heading 2" },
  { type: "bullet", label: "Bullet list" },
  { type: "todo", label: "To-do" },
  { type: "quote", label: "Quote" },
  { type: "code", label: "Code" },
  { type: "divider", label: "Divider" },
];

interface SlashMenuProps {
  open: boolean;
  onSelect: (type: DocumentBlock["type"]) => void;
  className?: string;
}

export function SlashMenu({ open, onSelect, className }: SlashMenuProps) {
  if (!open) return null;

  return (
    <div className={cn("absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-surface-border bg-surface-elevated p-1 shadow-xl", className)}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.type}
          type="button"
          onClick={() => onSelect(opt.type)}
          className="flex w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}