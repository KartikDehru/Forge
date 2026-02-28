// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { notificationsFor } from "@/domain/activity";
import { createSeedState } from "@/lib/seed-data";
import { useWorkspaceStore } from "@/store/workspace-store";

// Seed roles in ws1: u1 owner, u2 admin, u3 member, u4 guest.
const store = () => useWorkspaceStore.getState();

beforeEach(() => {
  window.localStorage.clear();
  useWorkspaceStore.setState(createSeedState());
});

describe("issue actions", () => {
  it("rejects creation by a guest with a FORBIDDEN error and records nothing", () => {
    const before = store().issues.length;
    const result = store().createIssue("u4", { title: "Sneaky", projectId: "p1" });
    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(store().issues).toHaveLength(before);
  });

  it("creates an issue with the next identifier and logs activity", () => {
    const result = store().createIssue("u3", { title: "  Fix drop jitter ", projectId: "p1", assigneeId: "u2" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.identifier).toBe("PLAT-27");
    expect(result.value.title).toBe("Fix drop jitter");
    const types = store().activity.slice(-2).map((e) => e.type);
    expect(types).toEqual(["issue.created", "issue.assigned"]);
  });

  it("gates deletion to owners and admins", () => {
    expect(store().deleteIssue("u3", "i7")).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(store().deleteIssue("u2", "i7").ok).toBe(true);
    expect(store().issues.find((i) => i.id === "i7")).toBeUndefined();
  });

  it("enforces the status machine and logs only successful transitions", () => {
    const activityBefore = store().activity.length;
    const skip = store().transitionIssue("u3", "i7", "done");
    expect(skip).toMatchObject({ ok: false, error: { code: "INVALID_TRANSITION" } });
    const needsAssignee = store().transitionIssue("u3", "i3", "todo"); // backlog -> todo is fine
    expect(needsAssignee.ok).toBe(true);
    const blocked = store().transitionIssue("u3", "i3", "in_progress"); // unassigned
    expect(blocked).toMatchObject({ ok: false, error: { code: "ASSIGNEE_REQUIRED" } });
    expect(store().activity).toHaveLength(activityBefore + 1);
    expect(store().activity.at(-1)).toMatchObject({
      type: "issue.status_changed",
      meta: { from: "backlog", to: "todo" },
    });
  });

  it("does not let someone from another workspace touch an issue", () => {
    useWorkspaceStore.setState({
      workspaces: store().workspaces.map((w) =>
        w.id === "ws1" ? { ...w, members: w.members.filter((m) => m.userId !== "u3") } : w
      ),
    });
    expect(store().transitionIssue("u3", "i2", "in_progress")).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});

describe("comments and notifications", () => {
  it("resolves mentions, bumps the count and notifies the mentioned member", () => {
    const before = store().issues.find((i) => i.id === "i6")!.commentCount;
    const result = store().addComment("u3", "issue", "i6", "@Jordan Lee can you take a look?");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mentions).toEqual(["u2"]);
    expect(store().issues.find((i) => i.id === "i6")!.commentCount).toBe(before + 1);
    const inbox = notificationsFor("u2", store().activity);
    expect(inbox[0]).toMatchObject({ reason: "mention", event: { type: "comment.added", actorId: "u3" } });
  });

  it("lets guests comment but rejects empty comments", () => {
    expect(store().addComment("u4", "issue", "i6", "Looks right to me").ok).toBe(true);
    expect(store().addComment("u4", "issue", "i6", "   ")).toMatchObject({
      ok: false,
      error: { code: "VALIDATION", field: "body" },
    });
  });
});

describe("pages", () => {
  it("creates pages for members and coalesces edit activity", () => {
    const created = store().createPage("u3", { projectId: "p1", title: "Retro" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const blocks = [{ ...created.value.blocks[0], content: "hello" }];
    store().savePageBlocks("u3", created.value.id, blocks, { recordActivity: true });
    store().savePageBlocks("u3", created.value.id, blocks, { recordActivity: true });
    const edits = store().activity.filter((e) => e.type === "page.edited" && e.entityId === created.value.id);
    expect(edits).toHaveLength(1);
    expect(edits[0].meta.count).toBe(2);
  });

  it("blocks guests from editing or creating pages", () => {
    expect(store().createPage("u4", { projectId: "p1", title: "x" }).ok).toBe(false);
    expect(store().savePageBlocks("u4", "doc1", [], {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});

describe("workspace administration", () => {
  it("lets admins invite members and protects the last owner", () => {
    const invited = store().inviteMember("u2", "ws1", { email: "robin.hart@northwind.dev", role: "member" });
    expect(invited.ok).toBe(true);
    if (invited.ok) expect(invited.value.name).toBe("Robin Hart");
    expect(store().workspaces[0].members).toHaveLength(5);

    expect(store().inviteMember("u3", "ws1", { email: "x@y.dev", role: "member" })).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(store().changeMemberRole("u1", "ws1", "u1", "member")).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
  });

  it("only owners can rename via settings.update and reset data", () => {
    expect(store().renameWorkspace("u3", "ws1", "Nope")).toMatchObject({ ok: false });
    expect(store().renameWorkspace("u2", "ws1", "Northwind Studio").ok).toBe(true);
    expect(store().workspaces[0].slug).toBe("northwind-studio");
    expect(store().resetData("u2")).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(store().resetData("u1").ok).toBe(true);
    expect(store().workspaces[0].name).toBe("Northwind Product");
  });
});
