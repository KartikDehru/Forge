import type { WorkspaceRole } from "@/types";
import { ROLE_LABELS } from "@/domain/permissions";
import { cn } from "@/lib/utils";

const styles: Record<WorkspaceRole, string> = {
  owner: "border-accent/50 bg-accent/10 text-accent",
  admin: "border-info/40 bg-info/10 text-info",
  member: "border-line-strong bg-raised text-ink-muted",
  guest: "border-line bg-transparent text-ink-subtle",
};

export function RoleBadge({ role, className }: { role: WorkspaceRole; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-px text-2xs font-medium uppercase tracking-wider",
        styles[role],
        className
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
