import type { User, Workspace, WorkspaceRole } from "@/types";
import { assignableRoles } from "./permissions";
import { domainError, err, ok, type DomainError, type Result } from "./result";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function roleOf(workspace: Workspace, userId: string): WorkspaceRole | null {
  return workspace.members.find((m) => m.userId === userId)?.role ?? null;
}

export function isMember(workspace: Workspace, userId: string): boolean {
  return roleOf(workspace, userId) !== null;
}

export function countOwners(workspace: Workspace): number {
  return workspace.members.filter((m) => m.role === "owner").length;
}

export function validateWorkspaceName(raw: string): Result<string, DomainError> {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2) {
    return err(domainError("VALIDATION", "Workspace name needs at least 2 characters.", "name"));
  }
  if (name.length > 60) {
    return err(domainError("VALIDATION", "Workspace name must be 60 characters or fewer.", "name"));
  }
  return ok(name);
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace"
  );
}

export interface InviteInput {
  email: string;
  role: WorkspaceRole;
}

export interface InviteCheck {
  email: string;
  role: WorkspaceRole;
  /** Set when the email already belongs to a known user who isn't in this workspace. */
  existingUserId: string | null;
}

export function validateInvite(
  input: InviteInput,
  ctx: { actorRole: WorkspaceRole | null; workspace: Workspace; users: readonly User[] }
): Result<InviteCheck, DomainError> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return err(domainError("VALIDATION", "Enter a valid email address.", "email"));
  }
  if (!assignableRoles(ctx.actorRole).includes(input.role)) {
    return err(
      domainError("FORBIDDEN", "You can't grant that role.", "role")
    );
  }
  const existing = ctx.users.find((u) => u.email.toLowerCase() === email) ?? null;
  if (existing && isMember(ctx.workspace, existing.id)) {
    return err(domainError("CONFLICT", `${existing.name} is already in this workspace.`, "email"));
  }
  return ok({ email, role: input.role, existingUserId: existing?.id ?? null });
}

export function validateRoleChange(
  input: { targetUserId: string; role: WorkspaceRole },
  ctx: { actorRole: WorkspaceRole | null; workspace: Workspace }
): Result<WorkspaceRole, DomainError> {
  const targetRole = roleOf(ctx.workspace, input.targetUserId);
  if (!targetRole) {
    return err(domainError("NOT_FOUND", "That person isn't in this workspace."));
  }
  if (targetRole === input.role) {
    return err(domainError("CONFLICT", "They already have that role."));
  }
  const grantable = assignableRoles(ctx.actorRole);
  if (!grantable.includes(input.role) || !grantable.includes(targetRole)) {
    return err(
      domainError("FORBIDDEN", "Your role can't change this member's access.")
    );
  }
  if (targetRole === "owner" && countOwners(ctx.workspace) <= 1) {
    return err(
      domainError("CONFLICT", "A workspace needs at least one owner. Promote someone else first.")
    );
  }
  return ok(input.role);
}

export function validateRemoval(
  input: { targetUserId: string },
  ctx: { actorRole: WorkspaceRole | null; workspace: Workspace }
): Result<true, DomainError> {
  const targetRole = roleOf(ctx.workspace, input.targetUserId);
  if (!targetRole) {
    return err(domainError("NOT_FOUND", "That person isn't in this workspace."));
  }
  if (!assignableRoles(ctx.actorRole).includes(targetRole)) {
    return err(domainError("FORBIDDEN", "Your role can't remove this member."));
  }
  if (targetRole === "owner" && countOwners(ctx.workspace) <= 1) {
    return err(domainError("CONFLICT", "The last owner can't be removed."));
  }
  return ok(true);
}

const AVATAR_COLORS = [
  "#d9883b",
  "#4f9d8c",
  "#c4586a",
  "#6f9a4a",
  "#4b88b8",
  "#b9783d",
  "#8a8f3a",
  "#c9654a",
];

/** Deterministic display name + color for an invited email. */
export function deriveInvitee(email: string): { name: string; avatarColor: string } {
  const local = email.split("@")[0] ?? email;
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
  let hash = 0;
  for (const ch of email) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return { name: name || email, avatarColor: AVATAR_COLORS[hash % AVATAR_COLORS.length] };
}
