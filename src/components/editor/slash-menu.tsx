"use client";

import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  type LucideIcon,
} from "lucide-react";
import type { BlockType } from "@/types";
import { cn } from "@/lib/utils";

export interface SlashOption {
  type: BlockType;
  label: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
}

export const SLASH_OPTIONS: SlashOption[] = [
  { type: "paragraph", label: "Text", description: "Plain paragraph", keywords: ["paragraph", "p", "plain"], icon: Pilcrow },
  { type: "heading1", label: "Heading 1", description: "Large section title", keywords: ["h1", "title", "header"], icon: Heading1 },
  { type: "heading2", label: "Heading 2", description: "Medium section title", keywords: ["h2", "subtitle", "header"], icon: Heading2 },
  { type: "bullet", label: "Bulleted list", description: "Unordered list item", keywords: ["ul", "bullet", "list"], icon: List },
  { type: "numbered", label: "Numbered list", description: "Ordered list item", keywords: ["ol", "number", "list"], icon: ListOrdered },
  { type: "todo", label: "To-do", description: "Checkbox you can tick off", keywords: ["task", "check", "checkbox"], icon: CheckSquare },
  { type: "quote", label: "Quote", description: "Pull quote or callout", keywords: ["blockquote", "callout"], icon: Quote },
  { type: "code", label: "Code", description: "Monospaced snippet", keywords: ["snippet", "pre", "mono"], icon: Code2 },
  { type: "divider", label: "Divider", description: "Horizontal rule", keywords: ["hr", "line", "separator"], icon: Minus },
];

export function filterSlashOptions(query: string): SlashOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_OPTIONS;
  return SLASH_OPTIONS.filter(
    (o) =>
      o.label.toLowerCase().includes(q) ||
      o.type.toLowerCase().includes(q) ||
      o.keywords.some((k) => k.startsWith(q))
  );
}

interface SlashMenuProps {
  id: string;
  options: SlashOption[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (type: BlockType) => void;
}

/** Listbox controlled by the focused block's textarea (aria-activedescendant). */
export function SlashMenu({ id, options, activeIndex, onHover, onSelect }: SlashMenuProps) {
  return (
    <div
      className="absolute left-0 top-full z-30 mt-1 w-72 animate-pop-in overflow-hidden rounded-lg border border-line-strong bg-raised shadow-[0_18px_44px_-16px_rgba(0,0,0,0.85)]"
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className="section-label border-b border-line px-3 py-1.5">Turn into</p>
      {options.length === 0 ? (
        <p className="px-3 py-4 text-xs text-ink-subtle">No blocks match. Keep typing or press Esc.</p>
      ) : (
        <ul id={id} role="listbox" aria-label="Block types" className="max-h-64 overflow-y-auto p-1">
          {options.map((opt, i) => {
            const Icon = opt.icon;
            const active = i === activeIndex;
            return (
              <li
                key={opt.type}
                id={`${id}-${i}`}
                role="option"
                aria-selected={active}
                onMouseMove={() => onHover(i)}
                onClick={() => onSelect(opt.type)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5",
                  active ? "bg-overlay" : ""
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded border",
                    active ? "border-accent/50 text-accent" : "border-line-strong text-ink-muted"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-ink">{opt.label}</span>
                  <span className="block truncate text-2xs text-ink-subtle">{opt.description}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
