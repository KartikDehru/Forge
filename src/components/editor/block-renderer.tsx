"use client";

import type { DocumentBlock } from "@/types";
import { cn } from "@/lib/utils";

interface BlockRendererProps {
  block: DocumentBlock;
  onChange: (content: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onFocus: () => void;
}

export function BlockRenderer({
  block,
  onChange,
  onEnter,
  onBackspaceEmpty,
  onFocus,
}: BlockRendererProps) {
  const common =
    "w-full resize-none bg-transparent text-zinc-100 placeholder:text-zinc-600 focus:outline-none";

  if (block.type === "divider") {
    return <hr className="my-3 border-surface-border" />;
  }

  if (block.type === "todo") {
    return (
      <div className="flex items-start gap-2 py-1">
        <input
          type="checkbox"
          checked={!!block.checked}
          onChange={(e) => onChange(e.target.checked ? "__checked__" : "__unchecked__")}
          className="mt-1.5 rounded border-surface-border"
        />
        <textarea
          value={block.content}
          rows={1}
          onFocus={onFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => handleKeys(e, onEnter, onBackspaceEmpty, block.content)}
          className={cn(common, block.checked && "text-zinc-500 line-through")}
          placeholder="To-do"
        />
      </div>
    );
  }

  const className = cn(
    common,
    "py-1",
    block.type === "heading1" && "text-2xl font-bold",
    block.type === "heading2" && "text-lg font-semibold",
    block.type === "quote" && "border-l-2 border-accent pl-3 italic text-zinc-300",
    block.type === "code" &&
      "rounded-lg bg-black/40 px-3 py-2 font-mono text-sm text-emerald-300",
    block.type === "bullet" && "pl-6 before:absolute before:ml-[-1rem] before:content-['•'] relative"
  );

  return (
    <textarea
      value={block.content}
      rows={block.type === "code" ? 3 : 1}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => handleKeys(e, onEnter, onBackspaceEmpty, block.content)}
      className={className}
      placeholder={placeholderFor(block.type)}
    />
  );
}

function placeholderFor(type: DocumentBlock["type"]): string {
  switch (type) {
    case "heading1":
      return "Heading 1";
    case "heading2":
      return "Heading 2";
    case "bullet":
      return "List item";
    case "quote":
      return "Quote";
    case "code":
      return "Code";
    default:
      return "Type '/' for commands…";
  }
}

function handleKeys(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  onEnter: () => void,
  onBackspaceEmpty: () => void,
  content: string
) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onEnter();
  }
  if (e.key === "Backspace" && content.length === 0) {
    e.preventDefault();
    onBackspaceEmpty();
  }
}