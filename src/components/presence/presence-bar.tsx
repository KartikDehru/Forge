"use client";

import { useCollabRoom } from "@/hooks/use-collab-room";
import { PresenceStack } from "@/components/presence/presence-stack";
import { cn } from "@/lib/utils";

interface PresenceBarProps {
  roomId: string;
  className?: string;
}

export function PresenceBar({ roomId, className }: PresenceBarProps) {
  const { peers, connected } = useCollabRoom(roomId);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <PresenceStack peers={peers} />
      <span
        className={cn(
          "text-xs",
          connected ? "text-emerald-400" : "text-amber-400"
        )}
      >
        {connected ? "Live" : "Reconnecting…"}
      </span>
    </div>
  );
}