import { describe, expect, it } from "vitest";
import type { Workspace } from "@/types";
import { assignableRoles, authorize, can } from "./permissions";
import { validateInvite, validateRemoval, validateRoleChange } from "./workspace";

const ws: Workspace = {
  id: "ws1",
  name: "Acme",
  slug: "acme",
  createdAt: "2026-01-01T00:00:00.000Z",
  members: [
    { userId: "u1", role: "owner", joinedAt: "" },
    { userId: "u2", role: "admin", joinedAt: "" },
    { userId: "u3", role: "member", joinedAt: "" },
    { userId: "u4", role: "guest", joinedAt: "" },
  ],
};

describe("permissions", () => {
  it("gates destructive and administrative actions by role", () => {
    expect(can("owner", "issue.delete")).toBe(true);
    expect(can("admin", "issue.delete")).toBe(true);
    expect(can("member", "issue.delete")).toBe(false);
    expect(can("guest", "issue.create")).toBe(false);
    expect(can("guest", "comment.add")).toBe(true);
    expect(can("member", "member.invite")).toBe(false);
    expect(can("admin", "settings.update")).toBe(true);
    expect(can("admin", "workspace.reset")).toBe(false);
    expect(can(null, "comment.add")).toBe(false);
  });

  it("returns a FORBIDDEN error with a readable message", () => {
    expect(authorize("guest", "issue.delete")).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(authorize("owner", "issue.delete").ok).toBe(true);
  });

  it("limits which roles each actor may grant", () => {
    expect(assignableRoles("owner")).toContain("owner");
    expect(assignableRoles("admin")).toEqual(["member", "guest"]);
    expect(assignableRoles("member")).toEqual([]);
  });
});

describe("membership rules", () => {
  const users = [
    { id: "u9", name: "Pat", email: "pat@x.dev", avatarColor: "#000" },
    { id: "u3", name: "Sam", email: "sam@x.dev", avatarColor: "#000" },
  ];

  it("validates invites", () => {
    const base = { actorRole: "admin" as const, workspace: ws, users };
    expect(validateInvite({ email: "nope", role: "member" }, base)).toMatchObject({
      ok: false,
      error: { field: "email" },
    });
    expect(validateInvite({ email: "x@y.dev", role: "admin" }, base)).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(validateInvite({ email: "SAM@x.dev", role: "member" }, base)).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
    expect(validateInvite({ email: "Pat@x.dev", role: "guest" }, base)).toMatchObject({
      ok: true,
      value: { existingUserId: "u9", email: "pat@x.dev" },
    });
  });

  it("protects the last owner and enforces admin hierarchy", () => {
    expect(
      validateRoleChange({ targetUserId: "u1", role: "member" }, { actorRole: "owner", workspace: ws })
    ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(
      validateRoleChange({ targetUserId: "u2", role: "guest" }, { actorRole: "admin", workspace: ws })
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(
      validateRoleChange({ targetUserId: "u3", role: "guest" }, { actorRole: "admin", workspace: ws }).ok
    ).toBe(true);
    expect(validateRemoval({ targetUserId: "u1" }, { actorRole: "owner", workspace: ws }).ok).toBe(false);
    expect(validateRemoval({ targetUserId: "u4" }, { actorRole: "admin", workspace: ws }).ok).toBe(true);
  });
});
