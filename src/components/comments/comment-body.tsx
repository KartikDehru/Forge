"use client";

import { useMemo } from "react";
import type { User } from "@/types";
import { parseMentionSegments } from "@/domain/mentions";

export function CommentBody({ body, users }: { body: string; users: User[] }) {
  const segments = useMemo(() => parseMentionSegments(body, users), [body, users]);
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
      {segments.map((seg, i) =>
        seg.type === "mention" ? (
          <span key={i} className="rounded bg-accent/15 px-1 font-medium text-accent">
            @{seg.value}
          </span>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </p>
  );
}
