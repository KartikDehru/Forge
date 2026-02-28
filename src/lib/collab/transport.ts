import type { PresenceUser } from "@/types";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

/**
 * Wire protocol shared by every transport. `from` is the sender's client id so
 * receivers can ignore their own echoes; `to` (on replies) addresses one peer.
 */
export type TransportMessage =
  | { kind: "sync-request"; roomId: string; from: string; stateVector: Uint8Array }
  | {
      kind: "sync-reply";
      roomId: string;
      from: string;
      to: string;
      update: Uint8Array;
      stateVector: Uint8Array;
      /** A final reply is never answered, which keeps the handshake finite. */
      final: boolean;
    }
  | { kind: "update"; roomId: string; from: string; update: Uint8Array }
  | { kind: "presence"; roomId: string; from: string; presence: PresenceUser }
  | { kind: "heartbeat"; roomId: string; from: string; seq: number; presence: PresenceUser }
  | { kind: "leave"; roomId: string; from: string };

export type MessageListener = (message: TransportMessage) => void;
export type StatusListener = (status: ConnectionStatus) => void;

/**
 * The seam between the Yjs room and the network. The shipped implementation is
 * a same-origin BroadcastChannel; a WebSocket transport only has to implement
 * this interface.
 */
export interface Transport {
  connect(): void;
  send(message: TransportMessage): void;
  onMessage(listener: MessageListener): () => void;
  onStatus(listener: StatusListener): () => void;
  getStatus(): ConnectionStatus;
  /** Re-open the underlying channel; the room re-syncs when it reports `connected`. */
  reconnect(): void;
  close(): void;
}

const RECONNECT_DELAY_MS = 250;

export class BroadcastTransport implements Transport {
  private channel: BroadcastChannel | null = null;
  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private status: ConnectionStatus = "connecting";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(private readonly roomId: string) {}

  connect(): void {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      this.setStatus("offline");
      return;
    }
    this.closed = false;
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    document.addEventListener("visibilitychange", this.handleVisibility);
    if (navigator.onLine === false) {
      this.setStatus("offline");
      return;
    }
    this.open();
  }

  private open(): void {
    this.channel?.close();
    this.channel = new BroadcastChannel(`forge:${this.roomId}`);
    this.channel.onmessage = (ev: MessageEvent<TransportMessage>) => {
      this.messageListeners.forEach((fn) => fn(ev.data));
    };
    this.setStatus("connected");
  }

  private handleOnline = (): void => this.reconnect();

  private handleOffline = (): void => {
    this.channel?.close();
    this.channel = null;
    this.setStatus("offline");
  };

  private handleVisibility = (): void => {
    // Throttled background tabs may have missed traffic; resync on return.
    if (document.visibilityState === "visible" && this.status === "connected") {
      this.reconnect();
    }
  };

  send(message: TransportMessage): void {
    if (this.status !== "connected") return;
    this.channel?.postMessage(message);
  }

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  reconnect(): void {
    if (this.closed || typeof BroadcastChannel === "undefined") return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.setStatus("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.closed) return;
      if (navigator.onLine === false) {
        this.setStatus("offline");
        return;
      }
      this.open();
    }, RECONNECT_DELAY_MS);
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.channel?.close();
    this.channel = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
      document.removeEventListener("visibilitychange", this.handleVisibility);
    }
    this.messageListeners.clear();
    this.statusListeners.clear();
  }

  private setStatus(next: ConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.statusListeners.forEach((fn) => fn(next));
  }
}
