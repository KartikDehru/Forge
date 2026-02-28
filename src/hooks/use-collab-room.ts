"use client";

import { useCallback, useEffect, useState } from "react";
import type { PresenceCursor, PresenceUser } from "@/types";
import { acquireRoom } from "@/lib/collab/room-registry";
import type { YjsRoom } from "@/lib/collab/yjs-room";
import type { ConnectionStatus } from "@/lib/collab/transport";
import { useCurrentUser } from "@/hooks/use-session";

export function useCollabRoom(roomId: string | null) {
  const user = useCurrentUser();
  const userId = user?.id;
  const userName = user?.name;
  const avatarColor = user?.avatarColor;
  const [room, setRoom] = useState<YjsRoom | null>(null);
  const [peers, setPeers] = useState<PresenceUser[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    if (!roomId || !userId || !userName || !avatarColor) {
      setRoom(null);
      setPeers([]);
      return;
    }
    const handle = acquireRoom({ roomId, userId, userName, avatarColor });
    setRoom(handle.room);
    const offPeers = handle.room.subscribePeers(setPeers);
    const offStatus = handle.room.subscribeStatus(setStatus);
    return () => {
      offPeers();
      offStatus();
      handle.release();
      setRoom(null);
    };
  }, [roomId, userId, userName, avatarColor]);

  const setCursor = useCallback(
    (cursor: PresenceCursor | undefined) => room?.setCursor(cursor),
    [room]
  );
  const reconnect = useCallback(() => room?.reconnect(), [room]);

  return { room, peers, status, setCursor, reconnect };
}
