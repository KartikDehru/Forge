"use client";

import { useMemo } from "react";
import type { PresenceUser } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface PresenceStackProps {
  peers: PresenceUser[];
  max?: number;
  className?: string;
}

/** One avatar per person, even if they have several tabs open. */
export function PresenceStack({ peers, max = 4, className }: PresenceStackProps) {
  const people = useMemo(() => {
    const seen = new Map<string, PresenceUser>();
    peers.forEach((p) => {
      if (!seen.has(p.userId)) seen.set(p.userId, p);
    });
    return Array.from(seen.values());
  }, [peers]);
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;

  return (
    <ul className={cn("flex items-center -space-x-1", className)} aria-label={`${people.length} viewing`}>
      {visible.map((peer) => (
        <li key={peer.userId}>
          <Avatar
            name={peer.name}
            color={peer.avatarColor}
            size="md"
            className="ring-2 ring-canvas"
          />
        </li>
      ))}
      {overflow > 0 && (
        <li className="pl-2 text-2xs text-ink-subtle">+{overflow}</li>
      )}
    </ul>
  );
}
