"use client";

import type { User } from "@/types";
import { parseMentionSegments } from "@/lib/mentions";

interface CommentBodyProps {
  body: string;
  users: User[];
}

export function CommentBody({ body, users }: CommentBodyProps) {
  const segments = parseMentionSegments(body, users);

  return (
    <p className="whitespace-pre-wrap text-sm text-zinc-200">
      {segments.map((seg, i) =>
        seg.type === "mention" ? (
          <span key={i} className="rounded bg-accent/20 px-1 text-accent">
            @{seg.value}
          </span>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </p>
  );
}