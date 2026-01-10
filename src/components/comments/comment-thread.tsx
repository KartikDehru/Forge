"use client";

import { useWorkspaceStore } from "@/store/workspace-store";
import { CommentComposer } from "@/components/comments/comment-composer";
import { CommentBody } from "@/components/comments/comment-body";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import type { Comment } from "@/types";

interface CommentThreadProps {
  entityType: Comment["entityType"];
  entityId: string;
}

export function CommentThread({ entityType, entityId }: CommentThreadProps) {
  const comments = useWorkspaceStore((s) =>
    s.comments.filter((c) => c.entityType === entityType && c.entityId === entityId)
  );
  const users = useWorkspaceStore((s) => s.users);

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-300">Comments</h2>
      <div className="mb-4 space-y-3">
        {comments.map((comment) => {
          const author = users.find((u) => u.id === comment.authorId);
          return (
            <article
              key={comment.id}
              className="flex gap-3 rounded-lg border border-surface-border bg-surface-elevated/40 p-3"
            >
              {author ? (
                <Avatar name={author.name} color={author.avatarColor} size="sm" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-zinc-700" />
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
                  <span className="font-medium text-zinc-300">
                    {author?.name ?? "Unknown"}
                  </span>
                  <span>{formatRelativeTime(comment.createdAt)}</span>
                </div>
                <CommentBody body={comment.body} users={users} />
              </div>
            </article>
          );
        })}
        {comments.length === 0 && (
          <p className="text-sm text-zinc-500">No comments yet.</p>
        )}
      </div>
      <CommentComposer entityType={entityType} entityId={entityId} />
    </section>
  );
}