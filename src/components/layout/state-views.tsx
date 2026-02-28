import Link from "next/link";
import { FileQuestion, Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function MissingState({ what }: { what: string }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <EmptyState
        icon={FileQuestion}
        title={`This ${what} doesn't exist`}
        description="It may have been deleted, or the link is out of date."
        action={
          <Link
            href="/"
            className="rounded-md border border-line-strong bg-raised px-3 py-1.5 text-xs font-medium text-ink hover:bg-overlay"
          >
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}

export function NoAccessState({ what }: { what: string }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <EmptyState
        icon={Lock}
        tone="danger"
        title={`You don't have access to this ${what}`}
        description="It belongs to a workspace you're not a member of. Ask an admin to invite you."
        action={
          <Link
            href="/"
            className="rounded-md border border-line-strong bg-raised px-3 py-1.5 text-xs font-medium text-ink hover:bg-overlay"
          >
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
