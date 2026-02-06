"use client";

import { useEffect, useState } from "react";
import { YjsRoom } from "@/lib/collab/yjs-room";
import type { PresenceUser } from "@/types";
import { useAuthStore } from "@/store/auth-store";

export function useCollabRoom(roomId: string | null) {
  const user = useAuthStore((s) => s.user);
  const [room, setRoom] = useState<YjsRoom | null>(null);
  const [peers, setPeers] = useState<PresenceUser[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!roomId || !user) {
      setRoom(null);
      setPeers([]);
      setConnected(false);
      return;
    }

    const instance = new YjsRoom({
      roomId,
      userId: user.id,
      userName: user.name,
      avatarColor: user.avatarColor,
    });
    instance.connect();
    setRoom(instance);
    setConnected(true);

    const unsub = instance.subscribePeers(setPeers);

    return () => {
      unsub();
      instance.disconnect();
      setRoom(null);
      setConnected(false);
    };
  }, [roomId, user]);

  return {
    room,
    peers,
    connected,
    setCursor: (cursor: PresenceUser["cursor"]) => room?.setCursor(cursor),
  };
}