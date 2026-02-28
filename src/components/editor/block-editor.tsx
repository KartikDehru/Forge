"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowLeftToLine, ArrowRightToLine, Eye, Plus, Trash2 } from "lucide-react";
import type { DocumentBlock, DocumentPage } from "@/types";
import { numberingFor } from "@/domain/blocks";
import type { DomainError } from "@/domain/result";
import { useCan, useCurrentUser } from "@/hooks/use-session";
import { useDocumentBlocks } from "@/hooks/use-document-blocks";
import { useDismiss } from "@/hooks/use-dismiss";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { BlockRow } from "@/components/editor/block-row";
import { SlashMenu, filterSlashOptions } from "@/components/editor/slash-menu";
import { ConnectionIndicator } from "@/components/presence/connection-indicator";
import { PresenceStack } from "@/components/presence/presence-stack";

interface BlockEditorProps {
  page: DocumentPage;
}

const SLASH_PATTERN = /^\/\S*$/;
const QUIET_ERRORS = new Set(["BLOCK_BOUNDARY", "BLOCK_DEPTH"]);

export function BlockEditor({ page }: BlockEditorProps) {
  const canEdit = useCan("page.edit", page.workspaceId);
  const user = useCurrentUser();
  const renamePage = useWorkspaceStore((s) => s.renamePage);
  const project = useWorkspaceStore((s) => s.projects.find((p) => p.id === page.projectId));
  const toastError = useUiStore((s) => s.toastError);
  const updater = useWorkspaceStore((s) => s.users.find((u) => u.id === page.updatedBy));

  const {
    blocks,
    ready,
    saveState,
    peers,
    localClientId,
    status,
    reconnect,
    focusRequest,
    setCursor,
    updateContent,
    toggleChecked,
    ops,
  } = useDocumentBlocks(page, !canEdit);

  const readOnly = !canEdit || !ready;
  const fields = useRef(new Map<string, HTMLTextAreaElement>());
  const slashId = useId();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; position: "before" | "after" } | null>(null);
  const [title, setTitle] = useState(page.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuFor(null), []);
  useDismiss(menuRef, menuFor !== null, closeMenu);

  useEffect(() => setTitle(page.title), [page.title]);

  const numbering = useMemo(() => numberingFor(blocks), [blocks]);

  // Move focus after structural edits (split, merge, move, ...).
  useEffect(() => {
    if (!focusRequest) return;
    const apply = () => {
      const el = fields.current.get(focusRequest.id);
      if (!el) return false;
      el.focus();
      const at = Math.min(focusRequest.caret ?? el.value.length, el.value.length);
      el.setSelectionRange(at, at);
      return true;
    };
    if (!apply()) requestAnimationFrame(apply);
  }, [focusRequest]);

  const report = useCallback(
    (error: DomainError | null, loud = false) => {
      if (error && (loud || !QUIET_ERRORS.has(error.code))) toastError(error);
    },
    [toastError]
  );

  const focusNeighbor = (id: string, direction: -1 | 1) => {
    const index = blocks.findIndex((b) => b.id === id);
    for (let i = index + direction; i >= 0 && i < blocks.length; i += direction) {
      const el = fields.current.get(blocks[i].id);
      if (el) {
        el.focus();
        const at = direction === -1 ? el.value.length : 0;
        el.setSelectionRange(at, at);
        return;
      }
    }
  };

  // -- slash menu -----------------------------------------------------------

  const focusedBlock = blocks.find((b) => b.id === focusedId);
  const slashActive =
    !readOnly &&
    !!focusedBlock &&
    focusedBlock.type !== "code" &&
    focusedBlock.type !== "divider" &&
    SLASH_PATTERN.test(focusedBlock.content) &&
    slashDismissed !== `${focusedBlock.id}:${focusedBlock.content}`;
  const slashOptions = useMemo(
    () => (slashActive && focusedBlock ? filterSlashOptions(focusedBlock.content.slice(1)) : []),
    [slashActive, focusedBlock]
  );

  useEffect(() => setSlashIndex(0), [focusedBlock?.content, focusedId]);

  const applySlash = (id: string, type: DocumentBlock["type"]) => {
    report(ops.applySlash(id, type));
    setSlashDismissed(null);
  };

  // -- keyboard -------------------------------------------------------------

  const handleKeyDown = (block: DocumentBlock) => (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (block.type === "divider") {
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        report(ops.remove(block.id));
      } else if (event.key === "Enter") {
        event.preventDefault();
        report(ops.split(block.id, 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusNeighbor(block.id, -1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        focusNeighbor(block.id, 1);
      }
      return;
    }

    const el = event.currentTarget as HTMLTextAreaElement;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (slashActive && focusedBlock?.id === block.id) {
      if (event.key === "ArrowDown" && slashOptions.length) {
        event.preventDefault();
        setSlashIndex((i) => (i + 1) % slashOptions.length);
        return;
      }
      if (event.key === "ArrowUp" && slashOptions.length) {
        event.preventDefault();
        setSlashIndex((i) => (i - 1 + slashOptions.length) % slashOptions.length);
        return;
      }
      if ((event.key === "Enter" || event.key === "Tab") && slashOptions.length) {
        event.preventDefault();
        applySlash(block.id, slashOptions[slashIndex].type);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setSlashDismissed(`${block.id}:${block.content}`);
        return;
      }
    }

    if (readOnly) return;

    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      report(ops.move(block.id, event.key === "ArrowUp" ? "up" : "down"));
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      report(event.shiftKey ? ops.outdent(block.id) : ops.indent(block.id));
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      const modified = event.metaKey || event.ctrlKey;
      if (block.type === "code" && !modified) return; // plain Enter inserts a newline in code
      event.preventDefault();
      let offset = start;
      if (start !== end) {
        const next = el.value.slice(0, start) + el.value.slice(end);
        updateContent(block.id, next);
        offset = start;
      }
      report(ops.split(block.id, block.type === "code" ? el.value.length : offset));
      return;
    }

    if (event.key === "Backspace" && start === 0 && end === 0) {
      event.preventDefault();
      report(ops.mergeUp(block.id));
      return;
    }

    if (event.key === "ArrowUp" && !event.shiftKey && start === 0 && end === 0) {
      event.preventDefault();
      focusNeighbor(block.id, -1);
      return;
    }
    if (event.key === "ArrowDown" && !event.shiftKey && start === el.value.length && end === el.value.length) {
      event.preventDefault();
      focusNeighbor(block.id, 1);
    }
  };

  const publishCursor = (id: string, el: HTMLTextAreaElement) =>
    setCursor({ blockId: id, offset: el.selectionStart, selectionEnd: el.selectionEnd });

  // -- drag & drop ----------------------------------------------------------

  const clearDrag = () => {
    setDrag(null);
    setDrop(null);
  };

  const remotePeers = useMemo(
    () => peers.filter((p) => p.clientId !== localClientId),
    [peers, localClientId]
  );

  const commitTitle = () => {
    const next = title.trim();
    if (!user || next === page.title) return setTitle(page.title);
    const result = renamePage(user.id, page.id, next);
    if (!result.ok) {
      toastError(result.error);
      setTitle(page.title);
    }
  };

  return (
    <article className="mx-auto w-full max-w-[44rem] px-6 pb-32 pt-10 pl-12">
      <header className="mb-6">
        <label htmlFor="page-title" className="sr-only">
          Page title
        </label>
        <input
          id="page-title"
          value={title}
          readOnly={!canEdit}
          maxLength={130}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
              fields.current.get(blocks[0]?.id ?? "")?.focus();
            }
            if (e.key === "Escape") {
              setTitle(page.title);
              e.currentTarget.blur();
            }
          }}
          placeholder="Untitled"
          className="-mx-1 w-full rounded-md bg-transparent px-1 py-0.5 text-[2.25rem] font-semibold leading-tight tracking-tight text-ink placeholder:text-ink-subtle/70 hover:bg-raised/50 focus-visible:bg-raised/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        />
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-4 text-xs text-ink-subtle">
          {project && (
            <span className="inline-flex items-center gap-1.5 text-ink-muted">
              <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: project.color }} aria-hidden="true" />
              {project.name}
            </span>
          )}
          <span>
            Edited {formatRelativeTime(page.updatedAt)}
            {updater ? ` by ${updater.name}` : ""}
          </span>
          <span className="ml-auto flex items-center gap-4">
            <span aria-live="polite" className={cn(saveState === "saving" && "text-accent")}>
              {!canEdit ? "" : saveState === "saving" ? "Saving…" : "Saved"}
            </span>
            <PresenceStack peers={peers} />
            <ConnectionIndicator status={status} onRetry={reconnect} />
          </span>
        </div>
      </header>

      {!canEdit && (
        <p className="mb-4 flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-xs text-ink-muted">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          You have read-only access to this page. Guests can comment but not edit.
        </p>
      )}

      <div
        role="group"
        aria-label="Page content"
        aria-busy={!ready}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop(null);
        }}
      >
        {blocks.map((block) => {
          const slashOpenHere = slashActive && focusedBlock?.id === block.id;
          const listId = `${slashId}-${block.id}`;
          return (
            <BlockRow
              key={block.id}
              ref={(el) => {
                if (el) fields.current.set(block.id, el);
                else fields.current.delete(block.id);
              }}
              block={block}
              numberLabel={numbering.get(block.id)}
              readOnly={readOnly}
              isDragging={drag === block.id}
              dropIndicator={drop?.id === block.id ? drop.position : null}
              remote={remotePeers.filter((p) => p.cursor?.blockId === block.id)}
              menuOpen={menuFor === block.id}
              slashListId={slashOpenHere && slashOptions.length ? listId : undefined}
              slashActiveId={slashOpenHere && slashOptions.length ? `${listId}-${slashIndex}` : undefined}
              slashMenu={
                slashOpenHere ? (
                  <SlashMenu
                    id={listId}
                    options={slashOptions}
                    activeIndex={slashIndex}
                    onHover={setSlashIndex}
                    onSelect={(type) => applySlash(block.id, type)}
                  />
                ) : null
              }
              menu={
                menuFor === block.id ? (
                  <div
                    ref={menuRef}
                    role="menu"
                    aria-label="Block actions"
                    className="absolute left-6 top-7 z-30 w-44 animate-pop-in rounded-lg border border-line-strong bg-raised p-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.85)]"
                  >
                    {(
                      [
                        ["Move up", ArrowUp, () => ops.move(block.id, "up")],
                        ["Move down", ArrowDown, () => ops.move(block.id, "down")],
                        ["Indent", ArrowRightToLine, () => ops.indent(block.id)],
                        ["Outdent", ArrowLeftToLine, () => ops.outdent(block.id)],
                        ["Delete", Trash2, () => ops.remove(block.id)],
                      ] as const
                    ).map(([label, Icon, run]) => (
                      <button
                        key={label}
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          report(run(), true);
                          setMenuFor(null);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-overlay",
                          label === "Delete" ? "text-danger" : "text-ink-muted hover:text-ink"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null
              }
              onChange={(value) => {
                updateContent(block.id, value);
                setSlashDismissed(null);
              }}
              onToggleChecked={(checked) => toggleChecked(block.id, checked)}
              onKeyDown={handleKeyDown(block)}
              onFocus={() => setFocusedId(block.id)}
              onBlur={(e) => {
                setFocusedId((id) => (id === block.id ? null : id));
                const next = e.relatedTarget as HTMLElement | null;
                if (!next?.closest("[data-block-field]")) setCursor(undefined);
              }}
              onSelect={(e) => publishCursor(block.id, e.currentTarget)}
              onToggleMenu={() => setMenuFor((id) => (id === block.id ? null : block.id))}
              onHandleDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/block-id", block.id);
                const row = e.currentTarget.closest("[data-row]");
                if (row) e.dataTransfer.setDragImage(row, 0, 0);
                setDrag(block.id);
              }}
              onHandleDragEnd={clearDrag}
              onRowDragOver={(e) => {
                if (!drag || drag === block.id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const rect = e.currentTarget.getBoundingClientRect();
                const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                setDrop((d) => (d?.id === block.id && d.position === position ? d : { id: block.id, position }));
              }}
              onRowDrop={(e) => {
                e.preventDefault();
                if (drag && drop) report(ops.reorder(drag, drop.id, drop.position), true);
                clearDrag();
              }}
            />
          );
        })}
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={() => report(ops.append())}
          disabled={!ready}
          className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-ink-subtle transition-colors hover:bg-raised/60 hover:text-ink-muted disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add a block
        </button>
      )}
    </article>
  );
}
