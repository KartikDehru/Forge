"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { Comment } from "@/types";
import {
  activeMentionQuery,
  filterMentionCandidates,
  insertMention,
  type MentionQuery,
} from "@/domain/mentions";
import { useCan, useCurrentUser, useMembers } from "@/hooks/use-session";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

interface CommentComposerProps {
  entityType: Comment["entityType"];
  entityId: string;
  workspaceId: string;
}

export function CommentComposer({ entityType, entityId, workspaceId }: CommentComposerProps) {
  const [body, setBody] = useState("");
  const [mention, setMention] = useState<MentionQuery | null>(null);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const user = useCurrentUser();
  const allowed = useCan("comment.add", workspaceId);
  const members = useMembers(workspaceId);
  const addComment = useWorkspaceStore((s) => s.addComment);
  const toastError = useUiStore((s) => s.toastError);

  const candidates = useMemo(
    () => (mention ? filterMentionCandidates(members.map((m) => m.user), mention.query) : []),
    [mention, members]
  );
  const showList = mention !== null && candidates.length > 0;

  const syncMention = (text: string, caret: number) => {
    setMention(activeMentionQuery(text, caret));
    setHighlight(0);
  };

  const pick = (index: number) => {
    const el = ref.current;
    const target = candidates[index];
    if (!el || !mention || !target) return;
    const result = insertMention(body, mention, el.selectionStart, target);
    setBody(result.text);
    setMention(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.caret, result.caret);
    });
  };

  const submit = () => {
    if (!user) return;
    const result = addComment(user.id, entityType, entityId, body);
    if (!result.ok) {
      toastError(result.error);
      return;
    }
    setBody("");
    setMention(null);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showList) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlight((i) => (i + 1) % candidates.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlight((i) => (i - 1 + candidates.length) % candidates.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        pick(highlight);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setMention(null);
        return;
      }
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  };

  if (!allowed) {
    return (
      <p className="rounded-md border border-dashed border-line-strong px-3 py-3 text-xs text-ink-subtle">
        You don&apos;t have access to comment in this workspace.
      </p>
    );
  }

  return (
    <div className="relative rounded-lg border border-line-strong bg-canvas focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
      <label htmlFor={`${listId}-ta`} className="sr-only">
        Write a comment
      </label>
      <textarea
        id={`${listId}-ta`}
        ref={ref}
        value={body}
        rows={3}
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={showList ? `${listId}-${highlight}` : undefined}
        aria-autocomplete="list"
        onChange={(e) => {
          setBody(e.target.value);
          syncMention(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={onKeyDown}
        onClick={(e) => syncMention(body, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setMention(null), 120)}
        placeholder="Leave a comment. Type @ to mention a teammate."
        className="block w-full resize-none bg-transparent px-3 pt-2.5 text-sm leading-relaxed text-ink placeholder:text-ink-subtle focus:outline-none"
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Mention a teammate"
          className="absolute bottom-full left-2 z-20 mb-1 w-64 animate-pop-in rounded-lg border border-line-strong bg-raised p-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.85)]"
        >
          {candidates.map((u, i) => (
            <li
              key={u.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(i);
              }}
              onMouseMove={() => setHighlight(i)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                i === highlight ? "bg-overlay text-ink" : "text-ink-muted"
              )}
            >
              <Avatar name={u.name} color={u.avatarColor} size="sm" />
              <span className="flex-1 truncate">{u.name}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <span className="flex items-center gap-1 text-2xs text-ink-subtle">
          <Kbd>⌘</Kbd>
          <Kbd>Enter</Kbd> to send
        </span>
        <Button size="sm" onClick={submit} disabled={!body.trim()}>
          Comment
        </Button>
      </div>
    </div>
  );
}
