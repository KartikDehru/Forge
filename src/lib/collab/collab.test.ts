import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import type { DocumentBlock } from "@/types";
import { createBlock, normalizeBlocks } from "@/domain/blocks";
import { MemoryHub, MemoryTransport } from "@/lib/collab/memory-transport";
import { YjsRoom } from "@/lib/collab/yjs-room";
import { PeerTracker, Heartbeat } from "@/lib/collab/heartbeat";
import {
  applyBlocksToYjs,
  applyTextDiff,
  observeBlocks,
  readBlocks,
  seedBlocksToYjs,
} from "@/lib/collab/block-sync";

function makeRoom(hub: MemoryHub, userId: string, extra = {}) {
  return new YjsRoom({
    roomId: "page:doc1",
    userId,
    userName: userId.toUpperCase(),
    avatarColor: "#d9883b",
    transport: new MemoryTransport(hub),
    heartbeatMs: 1000,
    ...extra,
  });
}

const blocks = (...ids: string[]): DocumentBlock[] =>
  normalizeBlocks(ids.map((id, order) => ({ ...createBlock(id, "paragraph", id), order })));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("heartbeat", () => {
  it("beats immediately and then on a fixed interval with increasing sequence numbers", () => {
    const seqs: number[] = [];
    const hb = new Heartbeat((s) => seqs.push(s), 1000);
    hb.start();
    expect(seqs).toEqual([1]);
    vi.advanceTimersByTime(3000);
    expect(seqs).toEqual([1, 2, 3, 4]);
    hb.stop();
    vi.advanceTimersByTime(5000);
    expect(seqs).toHaveLength(4);
  });

  it("expires peers that stop beating and keeps ones that continue", () => {
    const tracker = new PeerTracker(3000);
    const peer = (clientId: string) => ({
      clientId,
      userId: clientId,
      name: clientId,
      avatarColor: "#000",
      lastSeen: 0,
    });
    tracker.upsert(peer("a"));
    tracker.upsert(peer("b"));
    vi.advanceTimersByTime(2000);
    tracker.upsert(peer("b"));
    vi.advanceTimersByTime(1500);
    expect(tracker.prune()).toBe(true);
    expect(tracker.list().map((p) => p.clientId)).toEqual(["b"]);
  });
});

describe("room sync and presence", () => {
  it("brings a late joiner up to date through the handshake", () => {
    const hub = new MemoryHub();
    const a = makeRoom(hub, "u1");
    a.connect();
    seedBlocksToYjs(a, "doc1", blocks("x", "y"));

    const b = makeRoom(hub, "u2");
    b.connect();
    expect(readBlocks(b, "doc1").map((x) => x.id)).toEqual(["x", "y"]);
    a.destroy();
    b.destroy();
  });

  it("resolves whenSynced as soon as a peer answers, and times out when alone", async () => {
    const hub = new MemoryHub();
    const alone = makeRoom(hub, "u1");
    alone.connect();
    const pending = alone.whenSynced(250);
    vi.advanceTimersByTime(250);
    await expect(pending).resolves.toBe(false);

    const joiner = makeRoom(hub, "u2");
    joiner.connect();
    await expect(joiner.whenSynced(250)).resolves.toBe(true);
    alone.destroy();
    joiner.destroy();
  });

  it("propagates edits and merges concurrent typing in the same block", () => {
    const hub = new MemoryHub();
    const a = makeRoom(hub, "u1");
    const b = makeRoom(hub, "u2");
    a.connect();
    b.connect();
    seedBlocksToYjs(a, "doc1", [{ ...createBlock("p", "paragraph", "hello world"), order: 0 }]);

    // Partition: both users type in the same block while disconnected.
    (a as unknown as { transport: MemoryTransport }).transport.disconnectLink();
    applyBlocksToYjs(a, "doc1", [{ ...createBlock("p", "paragraph", "hello brave world"), order: 0 }]);
    applyBlocksToYjs(b, "doc1", [{ ...createBlock("p", "paragraph", "hello world!"), order: 0 }]);

    a.reconnect();
    expect(readBlocks(a, "doc1")[0].content).toBe("hello brave world!");
    expect(readBlocks(b, "doc1")[0].content).toBe("hello brave world!");
    a.destroy();
    b.destroy();
  });

  it("tracks peers via heartbeats, shows connection state, and drops departed peers", () => {
    const hub = new MemoryHub();
    const a = makeRoom(hub, "u1");
    const b = makeRoom(hub, "u2");
    const statuses: string[] = [];
    a.subscribeStatus((s) => statuses.push(s));
    a.connect();
    b.connect();
    expect(a.getPeers().map((p) => p.userId)).toEqual(["u1", "u2"]);

    (a as unknown as { transport: MemoryTransport }).transport.disconnectLink();
    expect(a.getPeers()).toHaveLength(1);
    a.reconnect();
    expect(statuses).toEqual(["connecting", "connected", "offline", "reconnecting", "connected"]);

    b.destroy();
    expect(a.getPeers().map((p) => p.userId)).toEqual(["u1"]);
    a.destroy();
  });

  it("expires a silent peer after missing three heartbeats", () => {
    const hub = new MemoryHub();
    const a = makeRoom(hub, "u1");
    const b = makeRoom(hub, "u2");
    a.connect();
    b.connect();
    // b stops beating without saying goodbye (crash / sleeping tab)
    (b as unknown as { heartbeat: Heartbeat }).heartbeat.stop();
    vi.advanceTimersByTime(3000);
    expect(a.getPeers().map((p) => p.userId)).toEqual(["u1", "u2"]);
    vi.advanceTimersByTime(1000);
    expect(a.getPeers().map((p) => p.userId)).toEqual(["u1"]);
    a.destroy();
    b.destroy();
  });

  it("throttles cursor broadcasts but always delivers the latest position", () => {
    const hub = new MemoryHub();
    const a = makeRoom(hub, "u1", { cursorThrottleMs: 100 });
    const b = makeRoom(hub, "u2");
    a.connect();
    b.connect();
    a.setCursor({ blockId: "x", offset: 1 });
    a.setCursor({ blockId: "x", offset: 2 });
    a.setCursor({ blockId: "y", offset: 3, selectionEnd: 5 });
    vi.advanceTimersByTime(150);
    const seen = b.getPeers().find((p) => p.userId === "u1");
    expect(seen?.cursor).toEqual({ blockId: "y", offset: 3, selectionEnd: 5 });
    a.destroy();
    b.destroy();
  });
});

describe("block sync", () => {
  it("does not seed over an existing shared document", () => {
    const hub = new MemoryHub();
    const a = makeRoom(hub, "u1");
    a.connect();
    expect(seedBlocksToYjs(a, "doc1", blocks("a"))).toBe(true);
    expect(seedBlocksToYjs(a, "doc1", blocks("stale1", "stale2"))).toBe(false);
    expect(readBlocks(a, "doc1").map((b) => b.id)).toEqual(["a"]);
    a.destroy();
  });

  it("flags only local transactions as local changes", () => {
    const hub = new MemoryHub();
    const a = makeRoom(hub, "u1");
    const b = makeRoom(hub, "u2");
    a.connect();
    b.connect();
    seedBlocksToYjs(a, "doc1", blocks("a"));
    const flags: boolean[] = [];
    observeBlocks(b, "doc1", (_blocks, change) => flags.push(change.local));
    applyBlocksToYjs(a, "doc1", blocks("a", "b"));
    applyBlocksToYjs(b, "doc1", blocks("a", "b", "c"));
    expect(flags).toEqual([false, false, true]);
    a.destroy();
    b.destroy();
  });

  it("applies a minimal text diff", () => {
    const doc = new Y.Doc();
    const text = doc.getText("t");
    text.insert(0, "the quick fox");
    applyTextDiff(text, "the quick brown fox");
    expect(text.toString()).toBe("the quick brown fox");
    applyTextDiff(text, "quick brown");
    expect(text.toString()).toBe("quick brown");
  });
});
