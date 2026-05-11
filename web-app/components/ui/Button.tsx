import React from "react";
import { cn } from "@/lib/cn";
import { getButtonClasses } from "@/lib/variants";
import { Spinner } from "./Spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "destructive"
    | "outline"
    | "link";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// Ref forwarding matters here because parent components may need to:
// - Position a Tooltip relative to this button (needs DOM ref for getBoundingClientRect)
// - Manage focus programmatically (modal close returns focus to the trigger button)
// - Integrate with third-party libraries that expect a ref
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) {
    const spinnerSize = size === "lg" ? "md" : "sm";

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={getButtonClasses({ variant, size, className })}
        {...props}
      >
        {/* Show spinner on left during loading — hide leftIcon to avoid clutter */}
        {loading ? (
          <Spinner size={spinnerSize} />
        ) : (
          leftIcon && <span aria-hidden="true">{leftIcon}</span>
        )}

        {/* Children always visible — prevents width collapse during loading */}
        {children && <span>{children}</span>}

        {/* Hide rightIcon during loading */}
        {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
      </button>
    );
  },
);
