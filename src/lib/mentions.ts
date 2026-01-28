import type { User } from "@/types";

const MENTION_REGEX = /@([A-Za-z][A-Za-z\s]*?)(?=\s|$|[.,!?])/g;

export interface MentionSegment {
  type: "text" | "mention";
  value: string;
  userId?: string;
}

export function extractMentionedUserIds(
  body: string,
  users: User[]
): string[] {
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_REGEX);
  while ((match = re.exec(body)) !== null) {
    const name = match[1].trim().toLowerCase();
    const user = users.find((u) => u.name.toLowerCase() === name);
    if (user && !ids.includes(user.id)) ids.push(user.id);
  }
  return ids;
}

export function parseMentionSegments(body: string, users: User[]): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let lastIndex = 0;
  const re = new RegExp(MENTION_REGEX);
  let match: RegExpExecArray | null;

  while ((match = re.exec(body)) !== null) {
    const start = match.index;
    const name = match[1].trim();
    if (start > lastIndex) {
      segments.push({ type: "text", value: body.slice(lastIndex, start) });
    }
    const user = users.find((u) => u.name.toLowerCase() === name.toLowerCase());
    if (user) {
      segments.push({ type: "mention", value: user.name, userId: user.id });
    } else {
      segments.push({ type: "text", value: `@${name}` });
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < body.length) {
    segments.push({ type: "text", value: body.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", value: body }];
}