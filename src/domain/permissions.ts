import type { WorkspaceRole } from "@/types";
import { domainError, err, ok, type DomainError, type Result } from "./result";

export type Permission =
  | "issue.create"
  | "issue.update"
  | "issue.transition"
  | "issue.delete"
  | "comment.add"
  | "page.create"
  | "page.edit"
  | "page.delete"
  | "member.invite"
  | "member.change_role"
  | "member.remove"
  | "settings.update"
  | "workspace.reset";

export const ROLE_ORDER: WorkspaceRole[] = ["owner", "admin", "member", "guest"];

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  guest: "Guest",
};

export const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  owner: "Full control, including role changes and resetting data.",
  admin: "Manage members, settings, and delete issues or pages.",
  member: "Create and edit issues and pages.",
  guest: "Read and comment only.",
};

const MATRIX: Record<Permission, readonly WorkspaceRole[]> = {
  "issue.create": ["owner", "admin", "member"],
  "issue.update": ["owner", "admin", "member"],
  "issue.transition": ["owner", "admin", "member"],
  "issue.delete": ["owner", "admin"],
  "comment.add": ["owner", "admin", "member", "guest"],
  "page.create": ["owner", "admin", "member"],
  "page.edit": ["owner", "admin", "member"],
  "page.delete": ["owner", "admin"],
  "member.invite": ["owner", "admin"],
  "member.change_role": ["owner", "admin"],
  "member.remove": ["owner", "admin"],
  "settings.update": ["owner", "admin"],
  "workspace.reset": ["owner"],
};

export function can(
  role: WorkspaceRole | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return MATRIX[permission].includes(role);
}

export function authorize(
  role: WorkspaceRole | null | undefined,
  permission: Permission
): Result<true, DomainError> {
  if (can(role, permission)) return ok(true);
  return err(
    domainError(
      "FORBIDDEN",
      role
        ? `Your role (${ROLE_LABELS[role]}) can't do this.`
        : "You are not a member of this workspace."
    )
  );
}

/** Roles an actor is allowed to hand out when inviting or changing roles. */
export function assignableRoles(actorRole: WorkspaceRole | null): WorkspaceRole[] {
  if (actorRole === "owner") return ["owner", "admin", "member", "guest"];
  if (actorRole === "admin") return ["member", "guest"];
  return [];
}
