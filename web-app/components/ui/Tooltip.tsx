"use client";

import { useState, useId } from "react";
import { cn } from "@/lib/cn";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

// Position classes for each side — tooltip positioned relative to the trigger
const sideClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {/* Trigger — add aria-describedby so screen readers announce tooltip */}
      <span aria-describedby={visible ? tooltipId : undefined}>{children}</span>

      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            "absolute z-tooltip whitespace-normal max-w-xs rounded-md",
            "bg-neutral-900 dark:bg-neutral-100",
            "text-neutral-50 dark:text-neutral-900",
            "px-2.5 py-1.5 text-xs shadow-md",
            "animate-fade-in pointer-events-none",
            sideClasses[side],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
