"use client";

import { useState } from "react";
import type { Workspace } from "@/types";
import type { DomainError } from "@/domain/result";
import { useCan, useCurrentUser } from "@/hooks/use-session";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function WorkspaceForm({ workspace }: { workspace: Workspace }) {
  const user = useCurrentUser();
  const canEdit = useCan("settings.update", workspace.id);
  const rename = useWorkspaceStore((s) => s.renameWorkspace);
  const toast = useUiStore((s) => s.toast);
  const [name, setName] = useState(workspace.name);
  const [error, setError] = useState<DomainError | null>(null);
  const dirty = name.trim() !== workspace.name;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const result = rename(user.id, workspace.id, name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setName(result.value.name);
    toast("success", "Workspace renamed");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Workspace name" error={error?.message} hint={canEdit ? undefined : "Only owners and admins can rename the workspace."}>
        {(props) => (
          <Input
            {...props}
            value={name}
            maxLength={70}
            disabled={!canEdit}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            className="max-w-sm"
          />
        )}
      </Field>
      <Field label="URL slug" hint="Derived from the name.">
        {(props) => <Input {...props} value={workspace.slug} readOnly disabled className="max-w-sm font-mono text-xs" />}
      </Field>
      {canEdit && (
        <Button type="submit" size="sm" disabled={!dirty}>
          Save changes
        </Button>
      )}
    </form>
  );
}
