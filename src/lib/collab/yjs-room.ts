import * as Y from "yjs";
import { nanoid } from "nanoid";
import type { PresenceUser } from "@/types";
import {
  CollabTransport,
  decodeSyncPayload,
  type TransportMessage,
} from "@/lib/collab/transport";

export interface RoomOptions {
  roomId: string;
  userId: string;
  userName: string;
  avatarColor: string;
}

export class YjsRoom {
  readonly doc: Y.Doc;
  readonly roomId: string;
  private transport: CollabTransport;
  private clientId: string;
  private localPresence: PresenceUser;
  private peers = new Map<string, PresenceUser>();
  private onPeersChange?: (peers: PresenceUser[]) => void;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor(options: RoomOptions) {
    this.roomId = options.roomId;
    this.doc = new Y.Doc();
    this.transport = new CollabTransport(options.roomId);
    this.clientId = nanoid(8);

    this.localPresence = {
      clientId: this.clientId,
      userId: options.userId,
      name: options.userName,
      avatarColor: options.avatarColor,
      lastSeen: Date.now(),
    };

    this.doc.on("update", (update: Uint8Array) => {
      this.transport.send({
        type: "sync",
        roomId: this.roomId,
        payload: update,
      });
    });
  }

  connect(): void {
    this.transport.connect();
    this.transport.onMessage(this.handleMessage);
    this.broadcastAwareness();
    this.heartbeat = setInterval(() => {
      this.localPresence.lastSeen = Date.now();
      this.broadcastAwareness();
    }, 5000);
  }

  private handleMessage = (message: TransportMessage): void => {
    if (message.roomId !== this.roomId) return;
    if (message.type === "sync") {
      const bytes = decodeSyncPayload(message.payload);
      if (bytes) {
        Y.applyUpdate(this.doc, bytes);
      }
    } else if (message.type === "awareness") {
      const peer = message.payload as PresenceUser;
      if (peer.clientId === this.clientId) return;
      this.peers.set(peer.clientId, { ...peer, lastSeen: Date.now() });
      this.pruneStalePeers();
      this.notifyPeers();
    }
  };

  private pruneStalePeers(): void {
    const cutoff = Date.now() - 15000;
    this.peers.forEach((peer, id) => {
      if (peer.lastSeen < cutoff) this.peers.delete(id);
    });
  }

  setCursor(cursor: PresenceUser["cursor"]): void {
    this.localPresence.cursor = cursor;
    this.broadcastAwareness();
  }

  subscribePeers(cb: (peers: PresenceUser[]) => void): () => void {
    this.onPeersChange = cb;
    cb(this.getPeers());
    return () => {
      this.onPeersChange = undefined;
    };
  }

  getPeers(): PresenceUser[] {
    return [this.localPresence, ...Array.from(this.peers.values())];
  }

  private notifyPeers(): void {
    this.onPeersChange?.(this.getPeers());
  }

  private broadcastAwareness(): void {
    this.transport.send({
      type: "awareness",
      roomId: this.roomId,
      payload: this.localPresence,
    });
  }

  getBlocksMap(pageId: string): Y.Map<unknown> {
    const root = this.doc.getMap("pages");
    let pageMap = root.get(pageId) as Y.Map<unknown> | undefined;
    if (!pageMap) {
      pageMap = new Y.Map();
      root.set(pageId, pageMap);
    }
    let blocks = pageMap.get("blocks") as Y.Map<unknown> | undefined;
    if (!blocks) {
      blocks = new Y.Map();
      pageMap.set("blocks", blocks);
    }
    return blocks;
  }

  disconnect(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.transport.disconnect();
    this.doc.destroy();
  }
}