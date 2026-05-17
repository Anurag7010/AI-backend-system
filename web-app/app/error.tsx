"use client";

// error.tsx MUST be 'use client' for two reasons:
// 1. It receives the reset() function as a prop — reset() triggers a re-render,
//    which requires React state. Server Components cannot trigger re-renders.
// 2. useEffect is needed to log the error — useEffect is Client Component only.
//    In production this would send the error to a service like Sentry.

import { useEffect } from "react";
import { logError } from "@/lib/error-logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, { route: typeof window !== 'undefined' ? window.location.pathname : undefined });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <div className="max-w-md w-full rounded-lg border border-destructive/30 bg-card p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground mb-1">{error.message}</p>

        {/* digest is Next.js's server-side error ID — useful for finding logs */}
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <button
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
