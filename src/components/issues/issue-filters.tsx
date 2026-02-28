"use client";

import { forwardRef } from "react";
import { Search, X } from "lucide-react";
import type { IssueLabel, User } from "@/types";
import { PRIORITIES, hasActiveFilters, type IssueFilters } from "@/domain/issues";
import { PRIORITY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Select } from "@/components/ui/input";

interface IssueFilterBarProps {
  filters: IssueFilters;
  onChange: (next: IssueFilters) => void;
  users: User[];
  labels: IssueLabel[];
  total: number;
  shown: number;
}

export const IssueFilterBar = forwardRef<HTMLInputElement, IssueFilterBarProps>(
  function IssueFilterBar({ filters, onChange, users, labels, total, shown }, searchRef) {
    const set = <K extends keyof IssueFilters>(key: K, value: IssueFilters[K]) =>
      onChange({ ...filters, [key]: value });
    const active = hasActiveFilters(filters);

    return (
      <div role="search" aria-label="Filter issues" className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <label htmlFor="issue-search" className="sr-only">
            Search issues
          </label>
          <input
            id="issue-search"
            ref={searchRef}
            type="search"
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                if (filters.query) set("query", "");
                else (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Search issues"
            aria-keyshortcuts="/"
            className="h-8 w-56 rounded-md border border-line-strong bg-canvas pl-8 pr-8 text-sm text-ink placeholder:text-ink-subtle hover:border-ink-subtle/60 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent [&::-webkit-search-cancel-button]:hidden"
          />
          {!filters.query && (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <Kbd>/</Kbd>
            </span>
          )}
        </div>

        <Select
          aria-label="Filter by assignee"
          value={filters.assignee}
          onChange={(e) => set("assignee", e.target.value)}
          className="w-36"
        >
          <option value="all">Any assignee</option>
          <option value="unassigned">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filter by priority"
          value={filters.priority}
          onChange={(e) => set("priority", e.target.value as IssueFilters["priority"])}
          className="w-32"
        >
          <option value="all">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filter by label"
          value={filters.label}
          onChange={(e) => set("label", e.target.value)}
          className="w-32"
        >
          <option value="all">Any label</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>

        {active && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ query: "", assignee: "all", priority: "all", label: "all" })}
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Clear
          </Button>
        )}
        <span className="ml-auto font-mono text-2xs text-ink-subtle" aria-live="polite">
          {active ? `${shown} of ${total}` : `${total}`} issues
        </span>
      </div>
    );
  }
);
