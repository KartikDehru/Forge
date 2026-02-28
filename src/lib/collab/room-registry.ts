import { YjsRoom, type RoomOptions } from "@/lib/collab/yjs-room";

interface Entry {
  room: YjsRoom;
  refs: number;
  disposeTimer: ReturnType<typeof setTimeout> | null;
}

const entries = new Map<string, Entry>();
/** Grace period so React strict-mode remounts reuse the room instead of rebuilding it. */
const DISPOSE_DELAY_MS = 80;

/**
 * Components share one room per (room id, user): the editor, presence bar and
 * connection indicator all see the same document, peer list and status.
 */
export function acquireRoom(options: RoomOptions): { room: YjsRoom; release: () => void } {
  const key = `${options.roomId}::${options.userId}`;
  let entry = entries.get(key);
  if (!entry) {
    const room = new YjsRoom(options);
    room.connect();
    entry = { room, refs: 0, disposeTimer: null };
    entries.set(key, entry);
  }
  if (entry.disposeTimer) {
    clearTimeout(entry.disposeTimer);
    entry.disposeTimer = null;
  }
  entry.refs += 1;
  const held = entry;
  let released = false;

  return {
    room: held.room,
    release: () => {
      if (released) return;
      released = true;
      held.refs -= 1;
      if (held.refs > 0) return;
      held.disposeTimer = setTimeout(() => {
        if (held.refs > 0) return;
        held.room.destroy();
        if (entries.get(key) === held) entries.delete(key);
      }, DISPOSE_DELAY_MS);
    },
  };
}
