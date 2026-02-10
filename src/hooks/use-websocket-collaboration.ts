"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CollabTransport } from "@/lib/collab/transport";

interface UseWebSocketCollaborationOptions {
  roomId: string;
  enabled?: boolean;
}

/**
 * Client hook mirroring a WebSocket collaboration channel.
 * Uses BroadcastChannel + localStorage under the hood for local demo sync.
 */
export function useWebSocketCollaboration({
  roomId,
  enabled = true,
}: UseWebSocketCollaborationOptions) {
  const transportRef = useRef<CollabTransport | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastPing, setLastPing] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const transport = new CollabTransport(roomId);
    transportRef.current = transport;
    transport.connect();
    setConnected(true);

    const off = transport.onMessage((msg) => {
      if (msg.type === "ping") setLastPing(Date.now());
    });

    return () => {
      off();
      transport.disconnect();
      transportRef.current = null;
      setConnected(false);
    };
  }, [roomId, enabled]);

  const sendAwareness = useCallback((payload: unknown) => {
    transportRef.current?.send({
      type: "awareness",
      roomId,
      payload,
    });
  }, [roomId]);

  const simulateDisconnect = useCallback(() => {
    transportRef.current?.simulateReconnect();
    setConnected(false);
    setTimeout(() => setConnected(true), 500);
  }, []);

  return { connected, lastPing, sendAwareness, simulateDisconnect };
}