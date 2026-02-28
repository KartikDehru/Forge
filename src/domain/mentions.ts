import type { User } from "@/types";

export interface MentionSegment {
  type: "text" | "mention";
  value: string;
  userId?: string;
}

export interface MentionQuery {
  /** Index of the `@` character. */
  start: number;
  /** Text typed after the `@`, up to the caret. */
  query: string;
}

const WORD_CHAR = /[\p{L}\p{N}_]/u;

function handlesFor(user: User): string[] {
  const handles = [user.name.toLowerCase()];
  const first = user.name.split(/\s+/)[0]?.toLowerCase();
  if (first) handles.push(first);
  const local = user.email.split("@")[0]?.toLowerCase();
  if (local) handles.push(local);
  return Array.from(new Set(handles));
}

/**
 * Candidate (handle, user) pairs sorted so the longest handle is tried first.
 * Full names win over first names, so "@Alex Chen" never resolves to "@Alex".
 * A first-name handle shared by several users is ambiguous and is dropped.
 */
function buildHandleIndex(users: User[]): { handle: string; user: User }[] {
  const counts = new Map<string, number>();
  const entries: { handle: string; user: User }[] = [];
  users.forEach((u) => {
    handlesFor(u).forEach((handle) => {
      counts.set(handle, (counts.get(handle) ?? 0) + 1);
      entries.push({ handle, user: u });
    });
  });
  return entries
    .filter((e) => counts.get(e.handle) === 1)
    .sort((a, b) => b.handle.length - a.handle.length);
}

function isMentionStart(body: string, index: number): boolean {
  if (body[index] !== "@") return false;
  if (index === 0) return true;
  return !WORD_CHAR.test(body[index - 1]);
}

/** Splits a body into text and resolved mention segments. */
export function parseMentionSegments(body: string, users: User[]): MentionSegment[] {
  const index = buildHandleIndex(users);
  const segments: MentionSegment[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    if (buffer) segments.push({ type: "text", value: buffer });
    buffer = "";
  };

  while (i < body.length) {
    if (isMentionStart(body, i)) {
      const rest = body.slice(i + 1).toLowerCase();
      const hit = index.find(({ handle }) => {
        if (!rest.startsWith(handle)) return false;
        const next = body[i + 1 + handle.length];
        return next === undefined || !WORD_CHAR.test(next);
      });
      if (hit) {
        flush();
        segments.push({
          type: "mention",
          value: body.slice(i + 1, i + 1 + hit.handle.length),
          userId: hit.user.id,
        });
        i += 1 + hit.handle.length;
        continue;
      }
    }
    buffer += body[i];
    i += 1;
  }
  flush();
  return segments;
}

/** Unique user ids mentioned in `body`, in order of first appearance. */
export function extractMentionedUserIds(body: string, users: User[]): string[] {
  const ids: string[] = [];
  parseMentionSegments(body, users).forEach((seg) => {
    if (seg.type === "mention" && seg.userId && !ids.includes(seg.userId)) {
      ids.push(seg.userId);
    }
  });
  return ids;
}

/**
 * If the caret sits inside an `@token`, returns where it starts and what has
 * been typed so far. Used to drive mention autocomplete.
 */
export function activeMentionQuery(text: string, caret: number): MentionQuery | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;
  if (!isMentionStart(before, at)) return null;
  const query = before.slice(at + 1);
  if (query.length > 32 || /[\n.,!?;:]/.test(query)) return null;
  // Names are at most a few words; a double space or a long run ends the mention.
  if (/\s{2,}/.test(query) || query.trim().split(/\s+/).length > 3) return null;
  return { start: at, query };
}

export function filterMentionCandidates(users: User[], query: string, limit = 6): User[] {
  const q = query.trim().toLowerCase();
  const scored = users
    .map((u) => {
      const name = u.name.toLowerCase();
      const parts = name.split(/\s+/);
      let score = -1;
      if (!q) score = 1;
      else if (name.startsWith(q)) score = 3;
      else if (parts.some((p) => p.startsWith(q))) score = 2;
      else if (name.includes(q)) score = 1;
      return { u, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score || a.u.name.localeCompare(b.u.name));
  return scored.slice(0, limit).map((x) => x.u);
}

/** Replaces the active `@query` with a full mention and returns new text + caret. */
export function insertMention(
  text: string,
  query: MentionQuery,
  caret: number,
  user: User
): { text: string; caret: number } {
  const insertion = `@${user.name} `;
  const next = text.slice(0, query.start) + insertion + text.slice(caret);
  return { text: next, caret: query.start + insertion.length };
}
