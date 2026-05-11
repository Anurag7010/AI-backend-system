import React, { useEffect, useRef, useImperativeHandle } from "react";
import { cn } from "@/lib/cn";
import { getInputClasses } from "@/lib/variants";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoResize?: boolean;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      error,
      helperText,
      autoResize = false,
      fullWidth = false,
      className,
      id,
      name,
      value,
      onChange,
      ...props
    },
    ref,
  ) {
    // Internal ref for DOM access (needed for autoResize height calculation).
    // We cannot use the forwarded ref directly because it may be a callback ref or null.
    // useImperativeHandle lets us expose the internal ref's element to the parent
    // while keeping internal access via internalRef.
    const internalRef = useRef<HTMLTextAreaElement>(null);

    // Expose the internal DOM node to the parent through the forwarded ref
    useImperativeHandle(ref, () => internalRef.current!, []);

    // Resize textarea height to fit content whenever value changes
    useEffect(() => {
      if (!autoResize || !internalRef.current) return;

      const el = internalRef.current;
      // Reset height to auto first — otherwise shrinking does not work
      // (scrollHeight reports the height of the content, not the element)
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, [value, autoResize]);

    const inputId = id ?? (name ? `textarea-${name}` : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperTextId = inputId ? `${inputId}-helper` : undefined;
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

        <textarea
          ref={internalRef}
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          rows={autoResize ? 3 : undefined}
          className={cn(
            getInputClasses({ state: error ? "error" : "default" }),
            "resize-none py-2",
            autoResize && "overflow-hidden",
            fullWidth && "w-full",
            className,
          )}
          {...props}
        />

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
