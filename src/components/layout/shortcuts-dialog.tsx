"use client";

import { useUiStore } from "@/store/ui-store";
import { Dialog } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

const GROUPS = [
  {
    title: "Global",
    items: [
      ["Open command palette", ["⌘", "K"]],
      ["Create issue", ["C"]],
      ["Go to dashboard / issues", ["G", "D", "·", "G", "I"]],
      ["Go to activity / settings", ["G", "A", "·", "G", "S"]],
      ["Show this sheet", ["?"]],
    ],
  },
  {
    title: "Issue board",
    items: [
      ["Focus search", ["/"]],
      ["Move focused card to next / previous status", ["Alt", "→", "·", "Alt", "←"]],
    ],
  },
  {
    title: "Editor",
    items: [
      ["Open block menu", ["/"]],
      ["Split block / new block", ["Enter"]],
      ["Merge with previous block", ["Backspace"]],
      ["Indent / outdent", ["Tab", "·", "⇧", "Tab"]],
      ["Move block up / down", ["Alt", "↑", "·", "Alt", "↓"]],
    ],
  },
] as const;

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" size="md">
      <div className="space-y-5">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="section-label mb-2">{group.title}</h3>
            <dl className="space-y-1.5">
              {group.items.map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between gap-4 text-sm">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="flex items-center gap-1">
                    {keys.map((k, i) =>
                      k === "·" ? (
                        <span key={i} className="px-1 text-ink-subtle" aria-hidden="true">
                          ·
                        </span>
                      ) : (
                        <Kbd key={i}>{k}</Kbd>
                      )
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
