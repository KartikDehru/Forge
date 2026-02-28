"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-6 py-24">
      <EmptyState
        icon={AlertTriangle}
        tone="danger"
        title="Something went wrong"
        description="The view failed to load. Your workspace data is untouched. Try again, or reload if it keeps happening."
        action={
          <div className="flex gap-2">
            <Button size="sm" onClick={reset}>
              Try again
            </Button>
            <Button size="sm" variant="secondary" onClick={() => window.location.assign("/")}>
              Go to dashboard
            </Button>
          </div>
        }
      />
    </div>
  );
}
