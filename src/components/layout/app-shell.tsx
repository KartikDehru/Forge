"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { Providers } from "@/components/providers";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen bg-surface text-zinc-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <CommandPalette />
      </div>
    </Providers>
  );
}