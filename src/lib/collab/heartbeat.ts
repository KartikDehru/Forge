import type { PresenceUser } from "@/types";

export const HEARTBEAT_INTERVAL_MS = 2000;
/** A peer is dropped after missing three consecutive beats. */
export const PEER_TTL_MS = HEARTBEAT_INTERVAL_MS * 3;

/**
 * Fires on a fixed interval with a monotonically increasing sequence number and
 * an immediate first beat, so tests and peers can reason about exactly when
 * and how often beats happen.
 */
export class Heartbeat {
  private timer: ReturnType<typeof setInterval> | null = null;
  private seq = 0;

  constructor(
    private readonly onBeat: (seq: number) => void,
    private readonly intervalMs = HEARTBEAT_INTERVAL_MS
  ) {}

  start(): void {
    if (this.timer) return;
    this.beat();
    this.timer = setInterval(() => this.beat(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  get sequence(): number {
    return this.seq;
  }

  private beat(): void {
    this.seq += 1;
    this.onBeat(this.seq);
  }
}

/** Tracks remote presence and expires peers that stop sending heartbeats. */
export class PeerTracker {
  private peers = new Map<string, PresenceUser>();

  constructor(
    private readonly ttlMs = PEER_TTL_MS,
    private readonly now: () => number = Date.now
  ) {}

  /** Returns true when the visible peer set (or a peer's cursor) changed. */
  upsert(presence: PresenceUser): boolean {
    const prev = this.peers.get(presence.clientId);
    const next = { ...presence, lastSeen: this.now() };
    this.peers.set(presence.clientId, next);
    return (
      !prev ||
      prev.name !== next.name ||
      prev.avatarColor !== next.avatarColor ||
      JSON.stringify(prev.cursor) !== JSON.stringify(next.cursor)
    );
  }

  remove(clientId: string): boolean {
    return this.peers.delete(clientId);
  }

  /** Drops expired peers; returns true if anything was removed. */
  prune(): boolean {
    const cutoff = this.now() - this.ttlMs;
    let removed = false;
    this.peers.forEach((peer, id) => {
      if (peer.lastSeen < cutoff) {
        this.peers.delete(id);
        removed = true;
      }
    });
    return removed;
  }

  list(): PresenceUser[] {
    return Array.from(this.peers.values());
  }

  clear(): void {
    this.peers.clear();
  }
}
