"use client";

// error.tsx MUST be 'use client' for two reasons:
// 1. It receives the reset() function as a prop — reset() triggers a re-render,
//    which requires React state. Server Components cannot trigger re-renders.
// 2. useEffect is needed to log the error — useEffect is Client Component only.
//    In production this would send the error to a service like Sentry.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production: errorTrackingService.capture(error)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <div className="max-w-md w-full rounded-lg border border-red-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-500 mb-1">{error.message}</p>

        {/* digest is Next.js's server-side error ID — useful for finding logs */}
        {error.digest && (
          <p className="text-xs text-gray-400 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
