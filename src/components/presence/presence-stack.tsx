"use client";

import type { PresenceUser } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface PresenceStackProps {
  peers: PresenceUser[];
  max?: number;
  className?: string;
}

export function PresenceStack({ peers, max = 5, className }: PresenceStackProps) {
  const visible = peers.slice(0, max);
  const overflow = peers.length - max;

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-2">
        {visible.map((peer) => (
          <Avatar
            key={peer.clientId}
            name={peer.name}
            color={peer.avatarColor}
            size="sm"
            online
            className="ring-2 ring-surface"
          />
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-2 text-xs text-zinc-500">+{overflow}</span>
      )}
      {peers.length === 0 && (
        <span className="text-xs text-zinc-500">No one else here</span>
      )}
    </div>
  );
}