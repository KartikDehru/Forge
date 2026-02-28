import { cn, initialsOf } from "@/lib/utils";
import { readableOn } from "@/lib/color";

interface AvatarProps {
  name: string;
  color: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  xs: "h-4 w-4 text-[8px]",
  sm: "h-5 w-5 text-[9px]",
  md: "h-6 w-6 text-2xs",
  lg: "h-8 w-8 text-xs",
};

export function Avatar({ name, color, size = "md", className }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded font-semibold",
        sizes[size],
        className
      )}
      style={{ backgroundColor: color, color: readableOn(color) }}
    >
      {initialsOf(name)}
    </span>
  );
}
