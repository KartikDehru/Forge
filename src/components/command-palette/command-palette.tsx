"use client";

import { useMemo, useState } from "react";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export function CommandPalette() {
  const { open, setOpen, commands } = useCommandPalette();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((cmd) => {
      const list = map.get(cmd.group) ?? [];
      list.push(cmd);
      map.set(cmd.group, list);
    });
    return map;
  }, [filtered]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
      />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-surface-border bg-surface-elevated shadow-2xl">
        <div className="flex items-center gap-2 border-b border-surface-border px-3">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, issues, actions…"
            className="w-full bg-transparent py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {Array.from(groups.entries()).map(([group, items]) => (
            <div key={group} className="mb-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {group}
              </p>
              <ul>
                {items.map((cmd) => (
                  <li key={cmd.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100"
                      )}
                      onClick={() => {
                        cmd.action();
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <span>{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="text-[10px] text-zinc-500">{cmd.shortcut}</kbd>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">No results</p>
          )}
        </div>
      </div>
    </div>
  );
}