import type { IssuePriority, IssueStatus } from "@/types";
import { PRIORITY_COLORS, STATUS_COLORS } from "@/lib/constants";

/** Hand-drawn status glyphs: shape carries meaning, not just color. */
export function StatusIcon({ status, className = "h-3.5 w-3.5" }: { status: IssueStatus; className?: string }) {
  const color = STATUS_COLORS[status];
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      {status === "backlog" && (
        <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" strokeDasharray="2.2 2.2" />
      )}
      {status === "todo" && <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" />}
      {status === "in_progress" && (
        <>
          <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" />
          <path d="M8 4a4 4 0 0 1 0 8z" fill={color} />
        </>
      )}
      {status === "in_review" && (
        <>
          <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" />
          <path d="M8 4a4 4 0 0 1 0 8a4 4 0 0 1-4-4h4z" fill={color} />
        </>
      )}
      {status === "done" && (
        <>
          <circle cx="8" cy="8" r="6.75" fill={color} />
          <path d="M5.2 8.2l2 2 3.6-3.9" stroke="#1a1815" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {status === "canceled" && (
        <>
          <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function PriorityIcon({ priority, className = "h-3.5 w-3.5" }: { priority: IssuePriority; className?: string }) {
  const color = PRIORITY_COLORS[priority];
  if (priority === "urgent") {
    return (
      <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
        <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill={color} />
        <path d="M8 4.5v4.2" stroke="#1a1815" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="8" cy="11.2" r="1" fill="#1a1815" />
      </svg>
    );
  }
  if (priority === "none") {
    return (
      <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
        <path d="M3 8h10" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.6 2.4" />
      </svg>
    );
  }
  const level = { low: 1, medium: 2, high: 3 }[priority];
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 4.4}
          y={10 - i * 3}
          width="3"
          height={4 + i * 3}
          rx="0.8"
          fill={i < level ? color : "#3a342b"}
        />
      ))}
    </svg>
  );
}
