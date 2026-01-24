export type TransportMessage =
  | { type: "sync"; roomId: string; payload: Uint8Array }
  | { type: "awareness"; roomId: string; payload: unknown }
  | { type: "ping"; roomId: string };

export type TransportListener = (message: TransportMessage) => void;

/**
 * Simulated WebSocket transport using BroadcastChannel for same-origin tabs
 * and localStorage events as a fallback for cross-tab sync.
 */
export class CollabTransport {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<TransportListener>();
  private roomId: string;
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  connect(): void {
    if (typeof window === "undefined") return;
    this.channel = new BroadcastChannel(`collab:${this.roomId}`);
    this.channel.onmessage = (ev: MessageEvent<TransportMessage>) => {
      this.listeners.forEach((fn) => fn(ev.data));
    };
    window.addEventListener("storage", this.onStorage);
    this.connected = true;
    this.emit({ type: "ping", roomId: this.roomId });
  }

  private onStorage = (ev: StorageEvent): void => {
    if (!ev.key?.startsWith(`collab-sync:${this.roomId}`)) return;
    if (!ev.newValue) return;
    try {
      const message = JSON.parse(ev.newValue) as TransportMessage;
      this.listeners.forEach((fn) => fn(message));
    } catch {
      // ignore
    }
  };

  send(message: TransportMessage): void {
    this.channel?.postMessage(message);
    try {
      const serializable =
        message.type === "sync"
          ? { ...message, payload: Array.from(message.payload) }
          : message.type === "awareness"
            ? message
            : message;
      localStorage.setItem(
        `collab-sync:${this.roomId}`,
        JSON.stringify(serializable)
      );
    } catch {
      // ignore
    }
  }

  onMessage(listener: TransportListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  simulateReconnect(): void {
    this.connected = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connected = true;
      this.emit({ type: "ping", roomId: this.roomId });
    }, 400);
  }

  isConnected(): boolean {
    return this.connected;
  }

  private emit(message: TransportMessage): void {
    this.listeners.forEach((fn) => fn(message));
  }

  disconnect(): void {
    this.channel?.close();
    this.channel = null;
    window.removeEventListener("storage", this.onStorage);
    this.listeners.clear();
    this.connected = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }
}

export function decodeSyncPayload(payload: unknown): Uint8Array | null {
  if (payload instanceof Uint8Array) return payload;
  if (Array.isArray(payload)) return new Uint8Array(payload as number[]);
  return null;
}