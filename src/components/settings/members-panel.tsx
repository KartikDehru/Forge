"use client";

import { useState } from "react";
import { UserMinus } from "lucide-react";
import type { Workspace, WorkspaceRole } from "@/types";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_ORDER,
  assignableRoles,
  type DomainError,
} from "@/domain";
import { useCan, useCurrentUser, useMembers, useRole } from "@/hooks/use-session";
import { formatRelativeTime } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { RoleBadge } from "@/components/ui/role-badge";

function InviteForm({ workspace }: { workspace: Workspace }) {
  const user = useCurrentUser();
  const role = useRole(workspace.id);
  const invite = useWorkspaceStore((s) => s.inviteMember);
  const toast = useUiStore((s) => s.toast);
  const grantable = assignableRoles(role);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>(grantable.includes("member") ? "member" : grantable[0] ?? "guest");
  const [error, setError] = useState<DomainError | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const result = invite(user.id, workspace.id, { email, role: inviteRole });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEmail("");
    setError(null);
    toast("success", `${result.value.name} added as ${ROLE_LABELS[inviteRole]}`);
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-start gap-2 border-b border-line px-4 py-3">
      <Field label="Invite by email" error={error?.field === "email" ? error.message : null} className="min-w-[220px] flex-1">
        {(props) => (
          <Input
            {...props}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="name@company.com"
          />
        )}
      </Field>
      <Field label="Role" error={error?.field === "role" ? error.message : null}>
        {(props) => (
          <Select {...props} value={inviteRole} onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)} className="w-32">
            {grantable.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Button type="submit" size="md" className="mt-[22px]" disabled={!email.trim()}>
        Send invite
      </Button>
      {error && !error.field && (
        <p role="alert" className="w-full text-xs text-danger">
          {error.message}
        </p>
      )}
    </form>
  );
}

export function MembersPanel({ workspace }: { workspace: Workspace }) {
  const me = useCurrentUser();
  const myRole = useRole(workspace.id);
  const members = useMembers(workspace.id);
  const canInvite = useCan("member.invite", workspace.id);
  const canChange = useCan("member.change_role", workspace.id);
  const changeRole = useWorkspaceStore((s) => s.changeMemberRole);
  const removeMember = useWorkspaceStore((s) => s.removeMember);
  const toast = useUiStore((s) => s.toast);
  const toastError = useUiStore((s) => s.toastError);
  const [removing, setRemoving] = useState<string | null>(null);
  const grantable = assignableRoles(myRole);

  const sorted = [...members].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.user.name.localeCompare(b.user.name)
  );
  const target = members.find((m) => m.user.id === removing);

  const onRole = (userId: string, role: WorkspaceRole) => {
    if (!me) return;
    const result = changeRole(me.id, workspace.id, userId, role);
    if (!result.ok) toastError(result.error);
    else toast("success", "Role updated");
  };

  const confirmRemove = () => {
    if (!me || !removing) return;
    const result = removeMember(me.id, workspace.id, removing);
    setRemoving(null);
    if (!result.ok) toastError(result.error);
    else toast("success", "Member removed");
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel/50">
      {canInvite && <InviteForm workspace={workspace} />}
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Workspace members</caption>
        <thead>
          <tr className="border-b border-line text-2xs uppercase tracking-wider text-ink-subtle">
            <th scope="col" className="px-4 py-2 font-medium">
              Member
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Role
            </th>
            <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">
              Joined
            </th>
            <th scope="col" className="w-10 px-4 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ user, role }) => {
            const editable = canChange && grantable.includes(role) && user.id !== me?.id;
            const joined = workspace.members.find((m) => m.userId === user.id)?.joinedAt;
            return (
              <tr key={user.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={user.name} color={user.avatarColor} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {user.name}
                        {user.id === me?.id && <span className="ml-1.5 text-xs font-normal text-ink-subtle">you</span>}
                      </p>
                      <p className="truncate text-xs text-ink-subtle">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {editable ? (
                    <Select
                      aria-label={`Role for ${user.name}`}
                      value={role}
                      onChange={(e) => onRole(user.id, e.target.value as WorkspaceRole)}
                      className="w-28"
                    >
                      {[role, ...grantable.filter((r) => r !== role)].map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <RoleBadge role={role} />
                  )}
                </td>
                <td className="hidden px-4 py-2.5 text-xs text-ink-subtle sm:table-cell">
                  {joined ? formatRelativeTime(joined) : ""}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {editable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${user.name}`}
                      title="Remove from workspace"
                      onClick={() => setRemoving(user.id)}
                    >
                      <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <dl className="grid gap-x-6 gap-y-1.5 border-t border-line bg-canvas/40 px-4 py-3 text-xs sm:grid-cols-2">
        {ROLE_ORDER.map((role) => (
          <div key={role} className="flex items-start gap-2">
            <dt className="w-14 shrink-0 pt-px">
              <RoleBadge role={role} />
            </dt>
            <dd className="text-ink-subtle">{ROLE_DESCRIPTIONS[role]}</dd>
          </div>
        ))}
      </dl>

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Remove ${target?.user.name ?? "member"}?`}
        description="They lose access immediately. Issues assigned to them become unassigned."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRemove} data-autofocus>
              Remove member
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Their comments and edits stay in the workspace history.
        </p>
      </Dialog>
    </div>
  );
}
