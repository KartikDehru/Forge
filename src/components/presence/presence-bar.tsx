"use client";

import { useCollabRoom } from "@/hooks/use-collab-room";
import { PresenceStack } from "@/components/presence/presence-stack";
import { ConnectionIndicator } from "@/components/presence/connection-indicator";
import { cn } from "@/lib/utils";

interface PresenceBarProps {
  roomId: string;
  className?: string;
}

export function PresenceBar({ roomId, className }: PresenceBarProps) {
  const { peers, status, reconnect } = useCollabRoom(roomId);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <PresenceStack peers={peers} />
      <ConnectionIndicator status={status} onRetry={reconnect} />
    </div>
  );
}
