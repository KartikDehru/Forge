"use client";

import { useState } from "react";
import { Database, TriangleAlert } from "lucide-react";
import { useActiveWorkspace, useCan, useCurrentUser } from "@/hooks/use-session";
import { useUiStore } from "@/store/ui-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { PageHeader } from "@/components/layout/page-header";
import { MissingState } from "@/components/layout/state-views";
import { MembersPanel } from "@/components/settings/members-panel";
import { WorkspaceForm } from "@/components/settings/workspace-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t border-line py-6 first:border-t-0 md:grid-cols-[220px_1fr] md:gap-8">
      <div>
        <h2 id={id} className="text-sm font-semibold">
          {title}
        </h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-ink-subtle">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const workspace = useActiveWorkspace();
  const user = useCurrentUser();
  const canReset = useCan("workspace.reset");
  const resetData = useWorkspaceStore((s) => s.resetData);
  const toast = useUiStore((s) => s.toast);
  const toastError = useUiStore((s) => s.toastError);
  const [confirming, setConfirming] = useState(false);

  if (!workspace) return <MissingState what="workspace" />;

  const reset = () => {
    if (!user) return;
    const result = resetData(user.id);
    setConfirming(false);
    if (!result.ok) toastError(result.error);
    else toast("success", "Workspace data restored to the starter set");
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <PageHeader title="Settings" description={workspace.name} className="mb-2" />

      <Section id="general" title="General" description="How this workspace appears to its members.">
        <WorkspaceForm key={workspace.id + workspace.name} workspace={workspace} />
      </Section>

      <Section
        id="members"
        title="Members"
        description="Roles control who can create, edit, delete and invite. Guests can read and comment."
      >
        <MembersPanel key={workspace.id} workspace={workspace} />
      </Section>

      <Section id="storage" title="Data" description="Where this workspace lives.">
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-line bg-panel/50 p-4">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-ink-muted">
              Forge stores this workspace in your browser&apos;s <span className="font-mono text-xs text-ink">localStorage</span>.
              It stays on this device, isn&apos;t backed up, and isn&apos;t shared with other browsers. Live collaboration
              works between tabs of the same browser.
            </p>
          </div>
          {canReset && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-danger/30 bg-danger/5 p-4">
              <div className="flex gap-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">Reset workspace data</p>
                  <p className="text-xs text-ink-subtle">Replaces everything stored in this browser with the starter workspace.</p>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
                Reset data
              </Button>
            </div>
          )}
        </div>
      </Section>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Reset all workspace data?"
        description="Issues, pages, comments, members and activity in this browser will be replaced."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={reset} data-autofocus>
              Reset everything
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">This can&apos;t be undone.</p>
      </Dialog>
    </div>
  );
}
