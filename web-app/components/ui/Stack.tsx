import { cn } from "@/lib/cn";

interface StackProps {
  direction?: "row" | "column";
  gap?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
  className?: string;
  children: React.ReactNode;
}

// Lookup objects instead of ternary chains — O(1) lookup, easier to read,
// TypeScript can exhaustively check all keys, trivial to add new values
const directionMap = {
  row: "flex-row",
  column: "flex-col",
} as const;

const gapMap = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
  12: "gap-12",
} as const;

const alignMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

const justifyMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
} as const;

export function Stack({
  direction = "column",
  gap = 4,
  align = "stretch",
  justify = "start",
  wrap = false,
  className,
  children,
}: StackProps) {
  return (
    <div
      className={cn(
        "flex",
        directionMap[direction],
        gapMap[gap],
        alignMap[align],
        justifyMap[justify],
        wrap && "flex-wrap",
        className,
      )}
    >
      {children}
    </div>
  );
}
