import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-6xl space-y-5 px-6 py-6">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
