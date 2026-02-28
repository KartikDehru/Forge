import type {
  ActivityEvent,
  Comment,
  DocumentBlock,
  DocumentPage,
  Issue,
  IssueLabel,
  Project,
  User,
  Workspace,
} from "@/types";
import { createBlock, normalizeBlocks } from "@/domain/blocks";

export interface SeedState {
  users: User[];
  workspaces: Workspace[];
  projects: Project[];
  pages: DocumentPage[];
  issues: Issue[];
  labels: IssueLabel[];
  comments: Comment[];
  activity: ActivityEvent[];
  notificationsReadAt: Record<string, string>;
  activeWorkspaceId: string;
  activeProjectId: string;
}

type BlockSpec = [id: string, type: DocumentBlock["type"], content: string, depth?: number, checked?: boolean];

function blocksFrom(spec: BlockSpec[]): DocumentBlock[] {
  return normalizeBlocks(
    spec.map(([id, type, content, depth = 0, checked], order) => {
      const block = { ...createBlock(id, type, content, depth), order };
      if (type === "todo") block.checked = checked ?? false;
      return block;
    })
  );
}

/** Builds the starting workspace relative to `now` so timestamps always feel recent. */
export function createSeedState(now: Date = new Date()): SeedState {
  const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();

  const users: User[] = [
    { id: "u1", name: "Alex Chen", email: "alex@northwind.dev", avatarColor: "#d9883b" },
    { id: "u2", name: "Jordan Lee", email: "jordan@northwind.dev", avatarColor: "#4f9d8c" },
    { id: "u3", name: "Sam Rivera", email: "sam@northwind.dev", avatarColor: "#c4586a" },
    { id: "u4", name: "Taylor Kim", email: "taylor@brightside.studio", avatarColor: "#6f9a4a" },
  ];

  const workspaces: Workspace[] = [
    {
      id: "ws1",
      name: "Northwind Product",
      slug: "northwind-product",
      createdAt: ago(24 * 120),
      members: [
        { userId: "u1", role: "owner", joinedAt: ago(24 * 120) },
        { userId: "u2", role: "admin", joinedAt: ago(24 * 110) },
        { userId: "u3", role: "member", joinedAt: ago(24 * 90) },
        { userId: "u4", role: "guest", joinedAt: ago(24 * 20) },
      ],
    },
    {
      id: "ws2",
      name: "Brightside Studio",
      slug: "brightside-studio",
      createdAt: ago(24 * 60),
      members: [
        { userId: "u1", role: "member", joinedAt: ago(24 * 55) },
        { userId: "u4", role: "owner", joinedAt: ago(24 * 60) },
      ],
    },
  ];

  const projects: Project[] = [
    {
      id: "p1",
      workspaceId: "ws1",
      key: "PLAT",
      name: "Platform",
      description: "Editor, issue tracking, and realtime collaboration core.",
      color: "#d9883b",
      createdAt: ago(24 * 100),
    },
    {
      id: "p2",
      workspaceId: "ws1",
      key: "MOB",
      name: "Mobile",
      description: "iOS and Android companion apps.",
      color: "#4f9d8c",
      createdAt: ago(24 * 70),
    },
    {
      id: "p3",
      workspaceId: "ws2",
      key: "BRAND",
      name: "Brand System",
      description: "Identity refresh: type, color, and components.",
      color: "#c4586a",
      createdAt: ago(24 * 50),
    },
  ];

  const labels: IssueLabel[] = [
    { id: "l1", workspaceId: "ws1", name: "bug", color: "#d0583f" },
    { id: "l2", workspaceId: "ws1", name: "feature", color: "#4b88b8" },
    { id: "l3", workspaceId: "ws1", name: "design", color: "#c4586a" },
    { id: "l4", workspaceId: "ws1", name: "infra", color: "#6f9a4a" },
    { id: "l5", workspaceId: "ws2", name: "identity", color: "#c4586a" },
    { id: "l6", workspaceId: "ws2", name: "components", color: "#4b88b8" },
  ];

  const issue = (
    id: string,
    projectId: string,
    workspaceId: string,
    identifier: string,
    title: string,
    description: string,
    status: Issue["status"],
    priority: Issue["priority"],
    assigneeId: string | null,
    labelIds: string[],
    createdBy: string,
    createdHoursAgo: number,
    updatedHoursAgo: number,
    commentCount = 0
  ): Issue => ({
    id,
    projectId,
    workspaceId,
    identifier,
    title,
    description,
    status,
    priority,
    assigneeId,
    labelIds,
    createdBy,
    createdAt: ago(createdHoursAgo),
    updatedAt: ago(updatedHoursAgo),
    commentCount,
  });

  const issues: Issue[] = [
    issue("i1", "p1", "ws1", "PLAT-12", "Slash menu: filter as you type", "Typing after / should narrow the list, arrow keys move, Enter applies.", "in_progress", "high", "u2", ["l2"], "u1", 24 * 12, 5, 3),
    issue("i2", "p1", "ws1", "PLAT-18", "Presence avatars flicker on reconnect", "Peers appear twice for a moment after a tab regains focus.", "todo", "medium", "u3", ["l1"], "u2", 24 * 10, 30, 1),
    issue("i3", "p1", "ws1", "PLAT-7", "Keyboard shortcut map for the palette", "Document the shortcuts and surface them in the palette footer.", "backlog", "low", null, ["l3"], "u1", 24 * 17, 24 * 9),
    issue("i4", "p1", "ws1", "PLAT-22", "Merge concurrent edits inside a single block", "Two people typing in the same paragraph should both keep their words.", "in_review", "urgent", "u1", ["l2"], "u2", 24 * 5, 2, 5),
    issue("i5", "p1", "ws1", "PLAT-3", "First-run checklist", "A short checklist that disappears once the workspace has content.", "done", "none", "u3", [], "u1", 24 * 25, 24 * 14, 2),
    issue("i6", "p1", "ws1", "PLAT-24", "Board columns jump when a card is dropped", "Layout shift on drop makes the next drag miss its target.", "todo", "high", "u2", ["l1"], "u3", 24 * 3, 20),
    issue("i7", "p1", "ws1", "PLAT-25", "Export a page to Markdown", "Headings, lists, to-dos, quotes, and code blocks.", "backlog", "medium", null, ["l2"], "u1", 24 * 2, 24 * 2),
    issue("i8", "p1", "ws1", "PLAT-26", "Retire the legacy sync endpoint", "Nothing reads from it any more.", "canceled", "low", "u3", ["l4"], "u1", 24 * 8, 24 * 6),
    issue("i9", "p2", "ws1", "MOB-4", "Offline drafts for comments", "Queue comments while offline and flush on reconnect.", "in_progress", "high", "u3", ["l2"], "u1", 24 * 6, 8, 1),
    issue("i10", "p2", "ws1", "MOB-6", "Tablet layout for the issue board", "Two-column fallback under 900px.", "backlog", "medium", null, ["l3"], "u2", 24 * 4, 24 * 4),
    issue("i11", "p3", "ws2", "BRAND-2", "Define the type scale", "Display, title, body, caption, and mono sizes.", "in_progress", "high", "u4", ["l5"], "u4", 24 * 9, 12),
    issue("i12", "p3", "ws2", "BRAND-3", "Button and input states", "Default, hover, focus, disabled, and error.", "todo", "medium", "u1", ["l6"], "u4", 24 * 7, 24 * 3),
  ];

  const pages: DocumentPage[] = [
    {
      id: "doc1",
      projectId: "p1",
      workspaceId: "ws1",
      title: "Product spec",
      createdAt: ago(24 * 40),
      updatedAt: ago(26),
      updatedBy: "u2",
      blocks: blocksFrom([
        ["b1", "heading1", "Platform spec: Q1"],
        ["b2", "paragraph", "Goals, scope, and milestones for the first quarter. Owner: @Alex Chen."],
        ["b3", "heading2", "Goals"],
        ["b4", "bullet", "Teams write and triage in the same place"],
        ["b5", "bullet", "Docs stay editable by several people at once", 1],
        ["b6", "bullet", "Presence is visible without being noisy", 1],
        ["b7", "bullet", "Issues never lose their context"],
        ["b8", "heading2", "Milestones"],
        ["b9", "numbered", "Editor foundations"],
        ["b10", "numbered", "Board filters and keyboard flow"],
        ["b11", "numbered", "Notifications and activity"],
        ["b12", "heading2", "Open questions"],
        ["b13", "todo", "Decide on guest access limits", 0, true],
        ["b14", "todo", "Confirm beta cohort with design partners"],
        ["b15", "quote", "Fast enough that nobody reaches for another tool."],
      ]),
    },
    {
      id: "doc2",
      projectId: "p1",
      workspaceId: "ws1",
      title: "Sprint planning notes",
      createdAt: ago(24 * 3),
      updatedAt: ago(6),
      updatedBy: "u1",
      blocks: blocksFrom([
        ["m1", "heading1", "Sprint planning"],
        ["m2", "paragraph", "Attendees: @Jordan Lee, @Sam Rivera, @Alex Chen"],
        ["m3", "heading2", "Decisions"],
        ["m4", "bullet", "Slash menu ships before drag handles"],
        ["m5", "bullet", "Sam picks up the presence flicker"],
        ["m6", "divider", ""],
        ["m7", "heading2", "Follow-ups"],
        ["m8", "todo", "Jordan: write up filter behaviour"],
        ["m9", "todo", "Alex: review the merge strategy PR"],
      ]),
    },
    {
      id: "doc3",
      projectId: "p2",
      workspaceId: "ws1",
      title: "Mobile roadmap",
      createdAt: ago(24 * 20),
      updatedAt: ago(24 * 2),
      updatedBy: "u3",
      blocks: blocksFrom([
        ["r1", "heading1", "Mobile roadmap"],
        ["r2", "paragraph", "Companion apps focus on reading, commenting, and quick capture."],
        ["r3", "bullet", "Offline drafts"],
        ["r4", "bullet", "Push notifications for mentions"],
        ["r5", "code", "GET /v1/inbox?since=<cursor>"],
      ]),
    },
    {
      id: "doc4",
      projectId: "p3",
      workspaceId: "ws2",
      title: "Type and color principles",
      createdAt: ago(24 * 12),
      updatedAt: ago(24),
      updatedBy: "u4",
      blocks: blocksFrom([
        ["t1", "heading1", "Type and color principles"],
        ["t2", "paragraph", "Warm neutrals, one accent, and a serif only where it earns its place."],
        ["t3", "bullet", "Contrast at least 4.5:1 for body text"],
        ["t4", "bullet", "One accent per screen"],
      ]),
    },
  ];

  const comment = (
    id: string,
    workspaceId: string,
    entityId: string,
    authorId: string,
    body: string,
    mentions: string[],
    hoursAgo: number
  ): Comment => ({
    id,
    workspaceId,
    entityType: "issue",
    entityId,
    authorId,
    body,
    mentions,
    createdAt: ago(hoursAgo),
    updatedAt: ago(hoursAgo),
  });

  const comments: Comment[] = [
    comment("c1", "ws1", "i1", "u1", "Let's land the slash menu before drag handles.", [], 30),
    comment("c2", "ws1", "i1", "u2", "@Alex Chen agreed. I'll wire filtering this week.", ["u1"], 22),
    comment("c3", "ws1", "i1", "u3", "Arrow-key navigation in the menu would be great too.", [], 9),
    comment("c4", "ws1", "i4", "u2", "@Alex Chen ready for review. Concurrent typing merges cleanly now.", ["u1"], 3),
  ];

  const activity: ActivityEvent[] = ([
    {
      id: "a1", workspaceId: "ws1", type: "issue.created", actorId: "u3", entityType: "issue", entityId: "i6",
      entityTitle: "Board columns jump when a card is dropped", meta: { identifier: "PLAT-24", projectId: "p1" }, createdAt: ago(72),
    },
    {
      id: "a2", workspaceId: "ws1", type: "page.created", actorId: "u1", entityType: "page", entityId: "doc2",
      entityTitle: "Sprint planning notes", meta: { projectId: "p1" }, createdAt: ago(70),
    },
    {
      id: "a3", workspaceId: "ws1", type: "issue.status_changed", actorId: "u2", entityType: "issue", entityId: "i4",
      entityTitle: "Merge concurrent edits inside a single block",
      meta: { identifier: "PLAT-22", from: "in_progress", to: "in_review", assigneeId: "u1" }, createdAt: ago(4),
    },
    {
      id: "a4", workspaceId: "ws1", type: "comment.added", actorId: "u2", entityType: "issue", entityId: "i4",
      entityTitle: "Merge concurrent edits inside a single block",
      meta: { identifier: "PLAT-22", mentions: ["u1"], assigneeId: "u1" }, createdAt: ago(3),
    },
    {
      id: "a5", workspaceId: "ws1", type: "issue.assigned", actorId: "u1", entityType: "issue", entityId: "i2",
      entityTitle: "Presence avatars flicker on reconnect", meta: { identifier: "PLAT-18", assigneeId: "u3" }, createdAt: ago(28),
    },
    {
      id: "a6", workspaceId: "ws1", type: "page.edited", actorId: "u2", entityType: "page", entityId: "doc1",
      entityTitle: "Product spec", meta: { count: 4 }, createdAt: ago(26),
    },
    {
      id: "a7", workspaceId: "ws1", type: "page.edited", actorId: "u1", entityType: "page", entityId: "doc2",
      entityTitle: "Sprint planning notes", meta: { count: 2 }, createdAt: ago(6),
    },
  ] as ActivityEvent[]).sort((x, y) => x.createdAt.localeCompare(y.createdAt));

  return {
    users,
    workspaces,
    projects,
    pages,
    issues,
    labels,
    comments,
    activity,
    notificationsReadAt: { u1: ago(10) },
    activeWorkspaceId: "ws1",
    activeProjectId: "p1",
  };
}
