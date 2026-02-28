"use client";

import { useMemo } from "react";
import { MessageSquare } from "lucide-react";
import type { Comment } from "@/types";
import { useMembers } from "@/hooks/use-session";
import { useWorkspaceStore } from "@/store/workspace-store";
import { CommentComposer } from "@/components/comments/comment-composer";
import { CommentBody } from "@/components/comments/comment-body";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";

interface CommentThreadProps {
  entityType: Comment["entityType"];
  entityId: string;
  workspaceId: string;
}

export function CommentThread({ entityType, entityId, workspaceId }: CommentThreadProps) {
  const allComments = useWorkspaceStore((s) => s.comments);
  const allUsers = useWorkspaceStore((s) => s.users);
  const members = useMembers(workspaceId);
  const memberUsers = useMemo(() => members.map((m) => m.user), [members]);
  const comments = useMemo(
    () =>
      allComments
        .filter((c) => c.entityType === entityType && c.entityId === entityId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [allComments, entityType, entityId]
  );

  return (
    <section aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold">
        Comments
        <span className="font-mono text-xs font-normal text-ink-subtle">{comments.length}</span>
      </h2>

      {comments.length === 0 ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-md border border-dashed border-line-strong px-3 py-3 text-xs text-ink-subtle">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          No comments yet. Start the conversation below.
        </div>
      ) : (
        <ol className="mb-4 space-y-0.5">
          {comments.map((comment) => {
            const author = allUsers.find((u) => u.id === comment.authorId);
            return (
              <li key={comment.id} className="flex gap-3 rounded-md px-1 py-2.5">
                <div className="pt-0.5">
                  {author ? (
                    <Avatar name={author.name} color={author.avatarColor} size="md" />
                  ) : (
                    <span className="block h-6 w-6 rounded bg-overlay" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-baseline gap-2 text-xs">
                    <span className="font-medium text-ink">{author?.name ?? "Former member"}</span>
                    <time dateTime={comment.createdAt} className="text-ink-subtle">
                      {formatRelativeTime(comment.createdAt)}
                    </time>
                  </div>
                  <CommentBody body={comment.body} users={memberUsers} />
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <CommentComposer entityType={entityType} entityId={entityId} workspaceId={workspaceId} />
    </section>
  );
}
