"use client";

import { cn } from "@/lib/utils";
import { avatarColorFor, initials } from "@/lib/selectors";

interface AvatarProps {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

// Per Responsive Contract §1.2: no font-size below 12px.
const sizeMap = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-lg",
};

export function Avatar({ name, color, size = "md", className }: AvatarProps) {
  const bg = color ?? avatarColorFor(name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        sizeMap[size],
        className
      )}
      style={{ backgroundColor: bg }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
