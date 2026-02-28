import * as Y from "yjs";
import { nanoid } from "nanoid";
import type { PresenceCursor, PresenceUser } from "@/types";
import {
  BroadcastTransport,
  type ConnectionStatus,
  type Transport,
  type TransportMessage,
} from "@/lib/collab/transport";
import { Heartbeat, HEARTBEAT_INTERVAL_MS, PeerTracker } from "@/lib/collab/heartbeat";

/** Origin for updates that came from the network; they must never be re-broadcast. */
export const REMOTE_ORIGIN = Symbol("forge.remote");
/** Origin for the initial seed of a page from persisted state. */
export const SEED_ORIGIN = Symbol("forge.seed");

export interface RoomOptions {
  roomId: string;
  userId: string;
  userName: string;
  avatarColor: string;
  transport?: Transport;
  heartbeatMs?: number;
  /** Minimum gap between cursor broadcasts. */
  cursorThrottleMs?: number;
}

type PeersListener = (peers: PresenceUser[]) => void;
type StatusListener = (status: ConnectionStatus) => void;

const EMPTY_UPDATE_BYTES = 2;

export class YjsRoom {
  readonly doc = new Y.Doc();
  readonly roomId: string;
  readonly clientId = nanoid(8);

  private readonly transport: Transport;
  private readonly heartbeat: Heartbeat;
  private readonly tracker: PeerTracker;
  private readonly cursorThrottleMs: number;
  private localPresence: PresenceUser;
  private peerListeners = new Set<PeersListener>();
  private statusListeners = new Set<StatusListener>();
  private syncWaiters = new Set<(synced: boolean) => void>();
  private synced = false;
  private status: ConnectionStatus = "connecting";
  private lastCursorSend = 0;
  private cursorTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribers: Array<() => void> = [];
  private destroyed = false;

  constructor(options: RoomOptions) {
    this.roomId = options.roomId;
    this.transport = options.transport ?? new BroadcastTransport(options.roomId);
    this.cursorThrottleMs = options.cursorThrottleMs ?? 60;
    const beatMs = options.heartbeatMs ?? HEARTBEAT_INTERVAL_MS;
    this.tracker = new PeerTracker(beatMs * 3);
    this.heartbeat = new Heartbeat((seq) => this.onBeat(seq), beatMs);
    this.localPresence = {
      clientId: this.clientId,
      userId: options.userId,
      name: options.userName,
      avatarColor: options.avatarColor,
      lastSeen: Date.now(),
    };

    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === REMOTE_ORIGIN) return;
      this.send({ kind: "update", roomId: this.roomId, from: this.clientId, update });
    });
  }

  connect(): void {
    this.unsubscribers.push(
      this.transport.onMessage(this.handleMessage),
      this.transport.onStatus(this.handleStatus)
    );
    this.transport.connect();
    this.status = this.transport.getStatus();
    this.heartbeat.start();
  }

  // -- connection ----------------------------------------------------------

  getStatus(): ConnectionStatus {
    return this.status;
  }

  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  reconnect(): void {
    this.transport.reconnect();
  }

  private handleStatus = (next: ConnectionStatus): void => {
    const was = this.status;
    this.status = next;
    this.statusListeners.forEach((fn) => fn(next));
    if (next === "connected" && was !== "connected") this.handshake();
    if (next === "offline") {
      this.tracker.clear();
      this.notifyPeers();
    }
  };

  /** Ask peers for whatever we're missing and announce ourselves. */
  private handshake(): void {
    this.send({
      kind: "sync-request",
      roomId: this.roomId,
      from: this.clientId,
      stateVector: Y.encodeStateVector(this.doc),
    });
    this.send({
      kind: "presence",
      roomId: this.roomId,
      from: this.clientId,
      presence: this.snapshotPresence(),
    });
  }

  /**
   * Resolves `true` as soon as a peer has answered a sync request, or `false`
   * after `timeoutMs` (no peers online - the local state is authoritative).
   */
  whenSynced(timeoutMs = 250): Promise<boolean> {
    if (this.synced) return Promise.resolve(true);
    return new Promise((resolve) => {
      const finish = (value: boolean) => {
        clearTimeout(timer);
        this.syncWaiters.delete(finish);
        resolve(value);
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      this.syncWaiters.add(finish);
    });
  }

  // -- messages ------------------------------------------------------------

  private send(message: TransportMessage): void {
    if (this.destroyed) return;
    this.transport.send(message);
  }

  private handleMessage = (message: TransportMessage): void => {
    if (message.roomId !== this.roomId || message.from === this.clientId) return;
    switch (message.kind) {
      case "sync-request": {
        this.send({
          kind: "sync-reply",
          roomId: this.roomId,
          from: this.clientId,
          to: message.from,
          update: Y.encodeStateAsUpdate(this.doc, message.stateVector),
          stateVector: Y.encodeStateVector(this.doc),
          final: false,
        });
        this.send({
          kind: "presence",
          roomId: this.roomId,
          from: this.clientId,
          presence: this.snapshotPresence(),
        });
        break;
      }
      case "sync-reply": {
        if (message.to !== this.clientId) return;
        this.applyRemote(message.update);
        if (!message.final) {
          const diff = Y.encodeStateAsUpdate(this.doc, message.stateVector);
          if (diff.byteLength > EMPTY_UPDATE_BYTES) {
            this.send({
              kind: "sync-reply",
              roomId: this.roomId,
              from: this.clientId,
              to: message.from,
              update: diff,
              stateVector: message.stateVector,
              final: true,
            });
          }
        }
        this.markSynced();
        break;
      }
      case "update":
        this.applyRemote(message.update);
        break;
      case "presence":
      case "heartbeat":
        if (this.tracker.upsert(message.presence)) this.notifyPeers();
        break;
      case "leave":
        if (this.tracker.remove(message.from)) this.notifyPeers();
        break;
    }
  };

  private applyRemote(update: Uint8Array): void {
    try {
      Y.applyUpdate(this.doc, update, REMOTE_ORIGIN);
    } catch (error) {
      console.error("[forge] ignored malformed collaboration update", error);
    }
  }

  private markSynced(): void {
    this.synced = true;
    Array.from(this.syncWaiters).forEach((fn) => fn(true));
  }

  // -- presence ------------------------------------------------------------

  private snapshotPresence(): PresenceUser {
    return { ...this.localPresence, lastSeen: Date.now() };
  }

  private onBeat(seq: number): void {
    if (this.tracker.prune()) this.notifyPeers();
    this.send({
      kind: "heartbeat",
      roomId: this.roomId,
      from: this.clientId,
      seq,
      presence: this.snapshotPresence(),
    });
  }

  /** Publishes the local caret/selection, throttled with a trailing edge. */
  setCursor(cursor: PresenceCursor | undefined): void {
    this.localPresence = { ...this.localPresence, cursor };
    this.notifyPeers();
    const elapsed = Date.now() - this.lastCursorSend;
    if (elapsed >= this.cursorThrottleMs) {
      this.flushCursor();
    } else if (!this.cursorTimer) {
      this.cursorTimer = setTimeout(() => this.flushCursor(), this.cursorThrottleMs - elapsed);
    }
  }

  private flushCursor(): void {
    if (this.cursorTimer) clearTimeout(this.cursorTimer);
    this.cursorTimer = null;
    this.lastCursorSend = Date.now();
    this.send({
      kind: "presence",
      roomId: this.roomId,
      from: this.clientId,
      presence: this.snapshotPresence(),
    });
  }

  subscribePeers(listener: PeersListener): () => void {
    this.peerListeners.add(listener);
    listener(this.getPeers());
    return () => this.peerListeners.delete(listener);
  }

  /** Local user first, then remote peers. */
  getPeers(): PresenceUser[] {
    return [this.localPresence, ...this.tracker.list()];
  }

  private notifyPeers(): void {
    const peers = this.getPeers();
    this.peerListeners.forEach((fn) => fn(peers));
  }

  // -- document ------------------------------------------------------------

  /**
   * One top-level map per page. Top-level types are resolved by name, so two
   * peers opening the same page concurrently converge on the same map instead
   * of racing to create nested ones.
   */
  getBlocksMap(pageId: string): Y.Map<unknown> {
    return this.doc.getMap(`blocks:${pageId}`);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.send({ kind: "leave", roomId: this.roomId, from: this.clientId });
    this.destroyed = true;
    this.heartbeat.stop();
    if (this.cursorTimer) clearTimeout(this.cursorTimer);
    this.syncWaiters.forEach((fn) => fn(false));
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    this.transport.close();
    this.peerListeners.clear();
    this.statusListeners.clear();
    this.doc.destroy();
  }
}
