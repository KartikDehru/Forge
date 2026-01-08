"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import type { Comment } from "@/types";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useAuthStore } from "@/store/auth-store";
import { extractMentionedUserIds } from "@/lib/mentions";
import { Button } from "@/components/ui/button";

interface CommentComposerProps {
  entityType: Comment["entityType"];
  entityId: string;
}

export function CommentComposer({ entityType, entityId }: CommentComposerProps) {
  const [body, setBody] = useState("");
  const users = useWorkspaceStore((s) => s.users);
  const addComment = useWorkspaceStore((s) => s.addComment);
  const user = useAuthStore((s) => s.user);

  const submit = () => {
    if (!body.trim() || !user) return;
    const comment: Comment = {
      id: nanoid(10),
      entityType,
      entityId,
      authorId: user.id,
      body: body.trim(),
      mentions: extractMentionedUserIds(body, users),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addComment(comment);
    setBody("");
  };

  return (
    <div className="rounded-lg border border-surface-border bg-surface-elevated p-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Write a comment… use @Name to mention"
        className="w-full resize-none bg-transparent text-sm text-zinc-200 focus:outline-none"
      />
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={submit} disabled={!user || !body.trim()}>
          Comment
        </Button>
      </div>
    </div>
  );
}