"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { useCommandPalette, type CommandItem } from "@/hooks/use-command-palette";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";

/** Subsequence match with a bonus for prefix / word-start hits. Returns -1 for no match. */
function score(label: string, hint: string | undefined, query: string): number {
  const text = `${label} ${hint ?? ""}`.toLowerCase();
  const q = query.toLowerCase();
  const direct = text.indexOf(q);
  if (direct !== -1) return 100 - direct + (direct === 0 ? 20 : 0);
  let ti = 0;
  for (const ch of q) {
    ti = text.indexOf(ch, ti);
    if (ti === -1) return -1;
    ti += 1;
  }
  return 10;
}

export function CommandPalette() {
  const { open, setOpen, commands } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  useFocusTrap(panelRef, open);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return commands.slice(0, 30);
    return commands
      .map((c) => ({ c, s: score(c.label, c.hint, q) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30)
      .map((x) => x.c);
  }, [commands, query]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    results.forEach((cmd) => map.set(cmd.group, [...(map.get(cmd.group) ?? []), cmd]));
    return Array.from(map.entries());
  }, [results]);

  useEffect(() => setActive(0), [query, open]);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  if (!open) return null;

  const run = (cmd: CommandItem) => {
    setOpen(false);
    cmd.action();
  };

  const onInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const cmd = results[active];
      if (cmd) run(cmd);
    }
  };

  const optionId = (i: number) => `${baseId}-opt-${i}`;
  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-canvas/80" aria-hidden="true" onMouseDown={() => setOpen(false)} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-xl animate-pop-in overflow-hidden rounded-xl border border-line-strong bg-panel shadow-[0_28px_70px_-22px_rgba(0,0,0,0.85)]"
      >
        <div className="flex items-center gap-2 border-b border-line px-3.5">
          <Search className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
          <input
            data-autofocus
            role="combobox"
            aria-expanded="true"
            aria-controls={`${baseId}-list`}
            aria-activedescendant={results.length ? optionId(active) : undefined}
            aria-autocomplete="list"
            aria-label="Search pages, issues and actions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search pages, issues, or run a command"
            className="h-12 w-full bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>

        <ul
          ref={listRef}
          id={`${baseId}-list`}
          role="listbox"
          aria-label="Results"
          className="max-h-[50vh] overflow-y-auto p-1.5"
        >
          {groups.map(([group, items]) => (
            <li key={group} role="presentation" className="mb-1">
              <p className="section-label px-2 py-1.5" role="presentation">
                {group}
              </p>
              <ul role="group" aria-label={group}>
                {items.map((cmd) => {
                  flatIndex += 1;
                  const index = flatIndex;
                  const Icon = cmd.icon;
                  const selected = index === active;
                  return (
                    <li
                      key={cmd.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={selected}
                      data-index={index}
                      onMouseMove={() => setActive(index)}
                      onClick={() => run(cmd)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                        selected ? "bg-overlay text-ink" : "text-ink-muted"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
                      {cmd.hint && <span className="font-mono text-2xs text-ink-subtle">{cmd.hint}</span>}
                      {cmd.shortcut && <Kbd>{cmd.shortcut}</Kbd>}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
          {results.length === 0 && (
            <li role="presentation" className="px-2 py-8 text-center text-sm text-ink-subtle">
              No matches for “{query}”
            </li>
          )}
        </ul>

        <footer className="flex items-center gap-4 border-t border-line px-3.5 py-2 text-2xs text-ink-subtle">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd><CornerDownLeft className="h-2.5 w-2.5" aria-hidden="true" /></Kbd> open</span>
        </footer>
      </div>
    </div>
  );
}
