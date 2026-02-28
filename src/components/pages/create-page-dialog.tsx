"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DomainError } from "@/domain/result";
import { useCan, useCurrentUser } from "@/hooks/use-session";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";

const FORM_ID = "create-page-form";

function CreatePageForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const preset = useUiStore((s) => s.createPage.projectId);
  const user = useCurrentUser();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const projects = useWorkspaceStore((s) => s.projects);
  const createPage = useWorkspaceStore((s) => s.createPage);
  const scoped = useMemo(() => projects.filter((p) => p.workspaceId === workspaceId), [projects, workspaceId]);

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(
    scoped.find((p) => p.id === preset)?.id ?? scoped[0]?.id ?? ""
  );
  const [error, setError] = useState<DomainError | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const result = createPage(user.id, { projectId, title: title.trim() || "Untitled" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
    router.push(`/pages/${result.value.id}`);
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-4">
      <Field label="Title" error={error?.field === "title" ? error.message : null}>
        {(props) => (
          <Input
            {...props}
            data-autofocus
            value={title}
            maxLength={130}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
            placeholder="Untitled"
            className="h-9 text-base font-medium"
          />
        )}
      </Field>
      <Field label="Project">
        {(props) => (
          <Select {...props} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {scoped.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {error && !error.field && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error.message}
        </p>
      )}
    </form>
  );
}

export function CreatePageDialog() {
  const open = useUiStore((s) => s.createPage.open);
  const close = useUiStore((s) => s.closeCreatePage);
  const allowed = useCan("page.create");

  return (
    <Dialog
      open={open && allowed}
      onClose={close}
      title="New page"
      description="Pages are shared documents that anyone in the workspace can open."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID}>
            Create page
          </Button>
        </>
      }
    >
      <CreatePageForm onDone={close} />
    </Dialog>
  );
}
