import { describe, expect, it } from "vitest";
import type { User } from "@/types";
import {
  activeMentionQuery,
  extractMentionedUserIds,
  filterMentionCandidates,
  insertMention,
  parseMentionSegments,
} from "./mentions";

const users: User[] = [
  { id: "u1", name: "Alex Chen", email: "alex@forge.dev", avatarColor: "#000" },
  { id: "u2", name: "Jordan Lee", email: "jordan@forge.dev", avatarColor: "#000" },
  { id: "u3", name: "Sam Rivera", email: "sam@forge.dev", avatarColor: "#000" },
  { id: "u4", name: "Sam Okafor", email: "sok@forge.dev", avatarColor: "#000" },
];

describe("mention parsing", () => {
  it("resolves full names, including multi-word names", () => {
    expect(extractMentionedUserIds("@Alex Chen agreed, thanks @Jordan Lee.", users)).toEqual([
      "u1",
      "u2",
    ]);
  });

  it("resolves unique first names and email handles", () => {
    expect(extractMentionedUserIds("ping @alex and @jordan", users)).toEqual(["u1", "u2"]);
    expect(extractMentionedUserIds("ping @sok", users)).toEqual(["u4"]);
  });

  it("drops ambiguous first names rather than guessing", () => {
    expect(extractMentionedUserIds("@Sam can you look?", users)).toEqual([]);
    expect(extractMentionedUserIds("@Sam Rivera can you look?", users)).toEqual(["u3"]);
  });

  it("deduplicates and ignores emails and unknown handles", () => {
    expect(extractMentionedUserIds("@alex @Alex Chen mail alex@forge.dev @nobody", users)).toEqual([
      "u1",
    ]);
  });

  it("does not match a prefix of a longer word", () => {
    expect(extractMentionedUserIds("@alexander", users)).toEqual([]);
  });

  it("produces ordered text and mention segments", () => {
    expect(parseMentionSegments("Hi @Jordan Lee, ship it", users)).toEqual([
      { type: "text", value: "Hi " },
      { type: "mention", value: "Jordan Lee", userId: "u2" },
      { type: "text", value: ", ship it" },
    ]);
  });
});

describe("mention autocomplete", () => {
  it("detects the active @token at the caret", () => {
    expect(activeMentionQuery("hello @ja", 9)).toEqual({ start: 6, query: "ja" });
    expect(activeMentionQuery("hello @", 7)).toEqual({ start: 6, query: "" });
    expect(activeMentionQuery("mail me at a@b.co", 17)).toBeNull();
    expect(activeMentionQuery("done. next", 5)).toBeNull();
  });

  it("ranks prefix matches first and inserts a full mention", () => {
    expect(filterMentionCandidates(users, "lee").map((u) => u.id)).toEqual(["u2"]);
    expect(filterMentionCandidates(users, "sam")).toHaveLength(2);
    const query = activeMentionQuery("hey @jo", 7)!;
    expect(insertMention("hey @jo", query, 7, users[1])).toEqual({
      text: "hey @Jordan Lee ",
      caret: 16,
    });
  });
});
