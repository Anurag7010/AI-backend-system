import React from "react";
import { cn } from "@/lib/cn";
import { getInputClasses } from "@/lib/variants";

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: "sm" | "md" | "lg";
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      error,
      helperText,
      size = "md",
      leftElement,
      rightElement,
      fullWidth = false,
      className,
      id,
      name,
      ...props
    },
    ref,
  ) {
    // Generate stable id from name if not provided
    // This links label htmlFor → input id for accessibility
    const inputId = id ?? (name ? `input-${name}` : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperTextId = inputId ? `${inputId}-helper` : undefined;

    // Determine which description element to point aria-describedby at
    const describedBy = error ? errorId : helperText ? helperTextId : undefined;

    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}

        {/* Wrapper for positioning left/right elements inside input */}
        <div className="relative flex items-center">
          {leftElement && (
            <span className="absolute left-3 flex items-center text-muted-foreground pointer-events-none">
              {leftElement}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            name={name}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              getInputClasses({ size, state: error ? "error" : "default" }),
              leftElement && "pl-9",
              rightElement && "pr-9",
              fullWidth && "w-full",
              className,
            )}
            {...props}
          />

          {rightElement && (
            <span className="absolute right-3 flex items-center text-muted-foreground pointer-events-none">
              {rightElement}
            </span>
          )}
        </div>

        {/* Error takes priority over helperText — show one or the other, never both */}
        {error && (
          <p
            id={errorId}
            className="text-xs text-error-600 dark:text-error-400"
          >
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperTextId} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);
