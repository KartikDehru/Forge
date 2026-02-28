"use client";

import { forwardRef, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import type { DocumentBlock, PresenceUser } from "@/types";
import { cn } from "@/lib/utils";
import { AutoTextarea } from "@/components/editor/auto-textarea";

const INDENT_PX = 26;
const BULLETS = ["\u2022", "\u25E6", "\u25AA"];

const PLACEHOLDERS: Partial<Record<DocumentBlock["type"], string>> = {
  heading1: "Heading 1",
  heading2: "Heading 2",
  bullet: "List item",
  numbered: "List item",
  todo: "To-do",
  quote: "Quote",
  code: "Code",
};

const FIELD_STYLES: Record<DocumentBlock["type"], string> = {
  paragraph: "py-[5px] text-[15px] leading-[1.65]",
  heading1: "pb-1 pt-5 text-[1.75rem] font-semibold leading-tight tracking-tight",
  heading2: "pb-0.5 pt-3.5 text-[1.25rem] font-semibold leading-snug tracking-tight",
  bullet: "py-[5px] text-[15px] leading-[1.65]",
  numbered: "py-[5px] text-[15px] leading-[1.65]",
  todo: "py-[5px] text-[15px] leading-[1.65]",
  quote: "my-1 border-l-2 border-accent/70 py-1 pl-3.5 text-[15px] italic leading-[1.65] text-ink-muted",
  code: "my-1 rounded-md border border-line bg-raised px-3 py-2.5 font-mono text-[13px] leading-relaxed text-ink",
  divider: "",
};

export interface BlockRowProps {
  block: DocumentBlock;
  numberLabel?: number;
  readOnly: boolean;
  isDragging: boolean;
  dropIndicator: "before" | "after" | null;
  remote: PresenceUser[];
  menuOpen: boolean;
  menu: ReactNode;
  slashMenu: ReactNode;
  slashListId?: string;
  slashActiveId?: string;
  onChange: (value: string) => void;
  onToggleChecked: (checked: boolean) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  onFocus: () => void;
  onBlur: (event: React.FocusEvent<HTMLElement>) => void;
  onSelect: (event: React.SyntheticEvent<HTMLTextAreaElement>) => void;
  onToggleMenu: () => void;
  onHandleDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  onHandleDragEnd: () => void;
  onRowDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onRowDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}

export const BlockRow = forwardRef<HTMLTextAreaElement, BlockRowProps>(function BlockRow(props, fieldRef) {
  const { block, readOnly, remote } = props;
  const accent = remote[0]?.avatarColor;
  const selecting = remote.some((p) => p.cursor && (p.cursor.selectionEnd ?? 0) > (p.cursor.offset ?? 0));

  let marker: ReactNode = null;
  if (block.type === "bullet") {
    marker = (
      <span className="w-5 shrink-0 select-none pt-[5px] text-center text-[15px] leading-[1.65] text-ink-muted" aria-hidden="true">
        {BULLETS[block.depth % BULLETS.length]}
      </span>
    );
  } else if (block.type === "numbered") {
    marker = (
      <span className="w-5 shrink-0 select-none pt-[5px] text-right font-mono text-[13px] leading-[1.75] text-ink-muted" aria-hidden="true">
        {props.numberLabel}.
      </span>
    );
  } else if (block.type === "todo") {
    marker = (
      <input
        type="checkbox"
        checked={!!block.checked}
        disabled={readOnly}
        onChange={(e) => props.onToggleChecked(e.target.checked)}
        aria-label="Completed"
        className="mt-[9px] h-4 w-4 shrink-0 cursor-pointer rounded-sm border-line-strong accent-[rgb(var(--accent))]"
      />
    );
  }

  return (
    <div
      data-row={block.id}
      onDragOver={props.onRowDragOver}
      onDrop={props.onRowDrop}
      className={cn("group/row relative flex items-start", props.isDragging && "opacity-40")}
      style={{
        paddingLeft: block.depth * INDENT_PX,
        backgroundColor: accent && selecting ? `${accent}14` : undefined,
      }}
    >
      {props.dropIndicator && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-0 z-10 h-0.5 rounded-[1px] bg-accent",
            props.dropIndicator === "before" ? "-top-px" : "-bottom-px"
          )}
          style={{ left: block.depth * INDENT_PX }}
        />
      )}

      {/* Row marker: amber while this block holds focus, peer color when a collaborator is here. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute -left-3 bottom-1 top-1 w-0.5 rounded-[1px] transition-colors",
          !accent && "bg-transparent group-focus-within/row:bg-accent/70"
        )}
        style={accent ? { backgroundColor: accent } : undefined}
      />

      {remote.length > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-2.5 right-0 z-10 flex gap-1"
        >
          {remote.map((p) => (
            <span
              key={p.clientId}
              className="rounded-sm px-1 py-px text-[10px] font-medium leading-none text-accent-ink"
              style={{ backgroundColor: p.avatarColor }}
            >
              {p.name.split(" ")[0]}
              {p.cursor && (p.cursor.selectionEnd ?? 0) > (p.cursor.offset ?? 0) ? " selecting" : ""}
            </span>
          ))}
        </span>
      )}

      {!readOnly && (
        <div
          className="absolute -left-9 top-[3px] flex w-7 justify-end opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100"
          style={{ left: block.depth * INDENT_PX - 36 }}
        >
          <button
            type="button"
            draggable
            onDragStart={props.onHandleDragStart}
            onDragEnd={props.onHandleDragEnd}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={props.onToggleMenu}
            aria-label="Block actions. Drag to reorder."
            aria-haspopup="menu"
            aria-expanded={props.menuOpen}
            className="flex h-6 w-5 cursor-grab items-center justify-center rounded text-ink-subtle transition-colors hover:bg-overlay hover:text-ink active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
          {props.menu}
        </div>
      )}

      {marker}

      <div className="relative min-w-0 flex-1">
        {block.type === "divider" ? (
          <div
            role="separator"
            tabIndex={readOnly ? -1 : 0}
            data-block-field={block.id}
            onKeyDown={props.onKeyDown}
            onFocus={props.onFocus}
            onBlur={props.onBlur}
            aria-label="Divider"
            className="block-field group/divider flex h-6 items-center focus-visible:outline-none"
          >
            <hr className="w-full border-line-strong transition-colors group-focus/divider:border-accent" />
          </div>
        ) : (
          <AutoTextarea
            ref={fieldRef}
            data-block-field={block.id}
            value={block.content}
            readOnly={readOnly}
            spellCheck={block.type !== "code"}
            aria-label={block.type === "heading1" || block.type === "heading2" ? "Heading" : "Block text"}
            aria-controls={props.slashListId}
            aria-expanded={props.slashListId ? true : undefined}
            aria-activedescendant={props.slashActiveId}
            aria-autocomplete={props.slashListId ? "list" : undefined}
            role={props.slashListId ? "combobox" : undefined}
            onChange={(e) => props.onChange(e.target.value)}
            onKeyDown={props.onKeyDown}
            onFocus={props.onFocus}
            onBlur={props.onBlur}
            onSelect={props.onSelect}
            placeholder={PLACEHOLDERS[block.type] ?? (readOnly ? "" : "Type / for blocks")}
            className={cn(
              "block-field block w-full resize-none overflow-hidden bg-transparent text-ink placeholder:text-ink-subtle/70 focus:outline-none",
              FIELD_STYLES[block.type],
              block.type === "todo" && block.checked && "text-ink-subtle line-through"
            )}
          />
        )}
        {props.slashMenu}
      </div>
    </div>
  );
});
