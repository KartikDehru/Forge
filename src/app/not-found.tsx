import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="text-sm text-zinc-500">This workspace item does not exist.</p>
      <Link href="/" className="text-sm text-accent hover:underline">
        Go home
      </Link>
    </div>
  );
}