import type {
  ConnectionStatus,
  MessageListener,
  StatusListener,
  Transport,
  TransportMessage,
} from "@/lib/collab/transport";

/**
 * In-process transport used by tests: every peer on a hub receives every
 * message synchronously, and the hub can be partitioned to simulate outages.
 */
export class MemoryHub {
  private peers = new Set<MemoryTransport>();

  join(peer: MemoryTransport): void {
    this.peers.add(peer);
  }

  leave(peer: MemoryTransport): void {
    this.peers.delete(peer);
  }

  broadcast(from: MemoryTransport, message: TransportMessage): void {
    this.peers.forEach((peer) => {
      if (peer !== from) peer.deliver(message);
    });
  }
}

export class MemoryTransport implements Transport {
  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private status: ConnectionStatus = "connecting";

  constructor(private readonly hub: MemoryHub) {}

  connect(): void {
    this.hub.join(this);
    this.setStatus("connected");
  }

  send(message: TransportMessage): void {
    if (this.status === "connected") this.hub.broadcast(this, message);
  }

  deliver(message: TransportMessage): void {
    if (this.status !== "connected") return;
    this.messageListeners.forEach((fn) => fn(message));
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

  /** Test helper: drop the link without closing the transport. */
  disconnectLink(): void {
    this.setStatus("offline");
  }

  reconnect(): void {
    this.setStatus("reconnecting");
    this.setStatus("connected");
  }

  close(): void {
    this.hub.leave(this);
    this.messageListeners.clear();
    this.statusListeners.clear();
  }

  private setStatus(next: ConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.statusListeners.forEach((fn) => fn(next));
  }
}
